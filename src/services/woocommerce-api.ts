import "server-only";

import { decrypt } from "@/lib/woo-crypto";
import { db } from "@/db";
import { wooStores } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface WooCustomer {
  id: number;
  date_created: string;
  date_created_gmt: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  is_paying_customer: boolean;
  avatar_url: string;
  meta_data: Array<{ key: string; value: string }>;
}

export interface WooOrder {
  id: number;
  number: string;
  status: string;
  date_created: string;
  date_created_gmt: string;
  total: string;
  total_tax: string;
  discount_total: string;
  shipping_total: string;
  currency: string;
  customer_id: number;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    subtotal: string;
    total: string;
    sku: string;
    price: string;
  }>;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  customer_note: string;
  meta_data: Array<{ key: string; value: string }>;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  status: string;
  type: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  stock_status: string;
  manage_stock: boolean;
  description: string;
  short_description: string;
  categories: Array<{ id: number; name: string; slug: string }>;
  images: Array<{ id: number; src: string; name: string; alt: string }>;
  attributes: Array<{
    id: number;
    name: string;
    options: string[];
  }>;
  weight: string;
  dimensions: { length: string; width: string; height: string };
  date_created: string;
  date_modified: string;
  meta_data: Array<{ key: string; value: string }>;
}

interface WooApiListResponse<T> {
  data: T[];
  headers: {
    total: string;
    totalPages: string;
  };
}

function isPrivateIP(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("172.")) {
    const second = parseInt(ip.split(".")[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("0.")) return true;
  return false;
}

function assertSafeUrl(urlStr: string): void {
  const parsed = new URL(urlStr);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`Unsafe protocol: ${parsed.protocol}`);
  }
  const hostname = parsed.hostname;
  if (isPrivateIP(hostname)) {
    throw new Error(`SSRF blocked: ${hostname} is a private/internal IP`);
  }
}

class WooCommerceApiClient {
  private baseUrl: string;
  private auth: string;

  constructor(url: string, consumerKey: string, consumerSecret: string) {
    const cleanUrl = url.replace(/\/+$/, "");
    assertSafeUrl(cleanUrl);
    this.baseUrl = `${cleanUrl}/wp-json/wc/v3`;
    this.auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${this.auth}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`WooCommerce API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  private async requestList<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<WooApiListResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${this.auth}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`WooCommerce API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as T[];
    return {
      data,
      headers: {
        total: response.headers.get("X-WP-Total") ?? "0",
        totalPages: response.headers.get("X-WP-TotalPages") ?? "0",
      },
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request<WooProduct[]>("/products", { per_page: "1" });
      return true;
    } catch {
      return false;
    }
  }

  async getCustomers(
    page = 1,
    perPage = 100
  ): Promise<WooApiListResponse<WooCustomer>> {
    return this.requestList<WooCustomer>("/customers", {
      page: String(page),
      per_page: String(Math.min(perPage, 100)),
    });
  }

  async getCustomer(id: number): Promise<WooCustomer> {
    return this.request<WooCustomer>(`/customers/${id}`);
  }

  async getOrders(
    page = 1,
    perPage = 100,
    status?: string
  ): Promise<WooApiListResponse<WooOrder>> {
    const params: Record<string, string> = {
      page: String(page),
      per_page: String(Math.min(perPage, 100)),
    };
    if (status) params.status = status;
    return this.requestList<WooOrder>("/orders", params);
  }

  async getOrder(id: number): Promise<WooOrder> {
    return this.request<WooOrder>(`/orders/${id}`);
  }

  async getProducts(
    page = 1,
    perPage = 100
  ): Promise<WooApiListResponse<WooProduct>> {
    return this.requestList<WooProduct>("/products", {
      page: String(page),
      per_page: String(Math.min(perPage, 100)),
    });
  }

  async getProduct(id: number): Promise<WooProduct> {
    return this.request<WooProduct>(`/products/${id}`);
  }

  async getAllCustomers(): Promise<WooCustomer[]> {
    const all: WooCustomer[] = [];
    let page = 1;
    const maxPages = 50;
    while (page <= maxPages) {
      const { data, headers } = await this.getCustomers(page, 100);
      all.push(...data);
      if (page >= Number(headers.totalPages)) break;
      page++;
    }
    return all;
  }

  async getAllOrders(status?: string): Promise<WooOrder[]> {
    const all: WooOrder[] = [];
    let page = 1;
    const maxPages = 50;
    while (page <= maxPages) {
      const { data, headers } = await this.getOrders(page, 100, status);
      all.push(...data);
      if (page >= Number(headers.totalPages)) break;
      page++;
    }
    return all;
  }

  async getAllProducts(): Promise<WooProduct[]> {
    const all: WooProduct[] = [];
    let page = 1;
    const maxPages = 50;
    while (page <= maxPages) {
      const { data, headers } = await this.getProducts(page, 100);
      all.push(...data);
      if (page >= Number(headers.totalPages)) break;
      page++;
    }
    return all;
  }
}

export function createWooClient(
  url: string,
  consumerKey: string,
  consumerSecret: string
): WooCommerceApiClient {
  return new WooCommerceApiClient(url, consumerKey, consumerSecret);
}

export async function createWooClientFromStore(storeId: string): Promise<WooCommerceApiClient | null> {
  const rows = await db
    .select()
    .from(wooStores)
    .where(eq(wooStores.id, storeId))
    .limit(1);
  const store = rows[0];
  if (!store || !store.active) return null;
  const key = decrypt(store.consumerKey);
  const secret = decrypt(store.consumerSecret);
  return new WooCommerceApiClient(store.url, key, secret);
}

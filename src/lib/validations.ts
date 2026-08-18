import { z } from "zod";

export const contactFormSchema = z.object({
  firstName: z.string().trim().min(1, "نام الزامی است").max(100),
  lastName: z.string().trim().max(100).nullable().optional(),
  email: z.string().trim().email("ایمیل معتبر نیست").or(z.literal("")).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  companyId: z.string().nullable().optional(),
  source: z.enum(["website", "referral", "social", "cold_call", "advertisement", "other"]).optional(),
  lifecycleStage: z.enum(["lead", "prospect", "customer", "inactive"]).optional(),
  ownerId: z.string().nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export const dealFormSchema = z.object({
  title: z.string().trim().min(1, "عنوان الزامی است").max(200),
  amount: z.coerce.number().min(0, "مبلغ نمی‌تواند منفی باشد").max(1e15),
  pipelineId: z.string().min(1, "فانل الزامی است"),
  stageId: z.string().min(1, "مرحله الزامی است"),
  contactId: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
  closeDate: z.string().nullable().optional(),
});

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "نام کالا الزامی است").max(150),
  sku: z.string().trim().min(1, "کد کالا الزامی است").max(100),
  unit: z.string().optional(),
  unitPrice: z.string().min(1, "قیمت فروش الزامی است"),
  costPrice: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  taxable: z.boolean().optional(),
  active: z.boolean().optional(),
  barcode: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const invoiceFormSchema = z.object({
  contactId: z.string().min(1, "مشتری الزامی است"),
  dueAt: z.string().nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
  discount: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().nullable().optional(),
        description: z.string().trim().min(1, "شرح الزامی است"),
        quantity: z.string().min(1, "تعداد الزامی است"),
        unitPrice: z.string().min(1, "قیمت الزامی است"),
        taxRate: z.string().optional(),
      })
    )
    .min(1, "حداقل یک آیتم لازم است"),
});

export const companyFormSchema = z.object({
  name: z.string().trim().min(1, "نام شرکت الزامی است").max(150),
  domain: z.string().trim().max(150).nullable().optional(),
  industry: z.string().trim().max(150).nullable().optional(),
  website: z.string().trim().max(300).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

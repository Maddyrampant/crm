export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { processDueReminders, processOverdueInvoices } = await import(
    "@/services/notifications"
  );

  const run = async () => {
    try {
      const overdue = await processOverdueInvoices();
      const reminders = await processDueReminders();
      if (overdue > 0 || reminders > 0) {
        console.log(
          `[scheduler] overdue=${overdue} reminders=${reminders}`
        );
      }
    } catch (err) {
      console.error("[scheduler] error:", err);
    }
  };

  run();
  setInterval(run, 60_000);
}

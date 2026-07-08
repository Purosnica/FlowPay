import { asegurarCronJobsRegistrados } from '../src/lib/cron/cron-execution-service';

export async function seedCronJobs(): Promise<void> {
  await asegurarCronJobsRegistrados();
  console.log('✅ Jobs de cron operativo registrados');
}

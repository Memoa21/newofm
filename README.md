# منصة إدارة المهام الذكية

تطبيق SaaS عربي لإدارة المهام الوظيفية الحكومية مع دعم RTL، Kanban، تحليل الأولويات بالذكاء الاصطناعي، وتصدير CSV.

## ما تم إنشاؤه

- واجهة عربية حديثة تعمل على الموبايل والكمبيوتر
- تسجيل دخول عبر Supabase Auth
- لوحة Dashboard مع إحصائيات ومهام Kanban
- مهام يدوية ومهام AI من نص حر
- سحب وإفلات مهمات بين الأعمدة
- تصدير CSV متوافق مع Excel
- صفحة تقارير إنتاجية داخل الواجهة
- نقطة نهاية Backend لـ Google Gemini API
- دعم كامل لـ RTL والعربية
- نموذج بيانات `users` و `tasks`

## ملفات رئيسية

- `app/page.tsx` - الواجهة الرئيسية باللغة العربية
- `app/api/ai/route.ts` - استدعاء AI عبر خادم آمن
- `lib/supabaseClient.ts` - إعداد Supabase client
- `.env.example` - مثال متغيرات البيئة

## المتطلبات

- Node.js 24
- NPM
- مشروع Supabase (PostgreSQL)
- مفتاح Google Gemini API

## إعداد متغيرات البيئة

قم بإنشاء ملف `.env.local` في جذر المشروع مع القيم التالية:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GOOGLE_API_KEY=your-google-gemini-api-key
```

## إنشاء الجداول في Supabase

يمكنك تشغيل الاستعلام التالي في SQL Editor:

```sql
create table if not exists users (
  id uuid primary key,
  email text,
  role text default 'user',
  created_at timestamp with time zone default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  title text not null,
  description text,
  source text,
  priority text default 'medium',
  status text default 'للعمل',
  due_date date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

## أمان Supabase

يمكنك تفعيل row-level security على جدول `tasks` ثم إضافة سياسة بسيطة مثل:

```sql
alter table tasks enable row level security;

create policy "Users can access own tasks" on tasks
  for select, update, delete
  using (auth.uid() = user_id);

create policy "Users can insert tasks" on tasks
  for insert
  with check (auth.uid() = user_id);
```

## التشغيل المحلي

```bash
npm install
npm run dev
```

## النشر

يمكن نشر التطبيق على Vercel أو أي منصة تدعم Next.js.

### نشر عبر Vercel

1. سجل الدخول:
   ```bash
   npx vercel login
   ```
2. نفِّذ النشر:
   ```bash
   npx vercel --prod
   ```
3. أضف المتغيرات البيئية في لوحة تحكم Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GOOGLE_API_KEY`

### ملاحظة

لم يتم نشر التطبيق تلقائيًا من هذه البيئة لأن Vercel CLI لم يكن لديه توكن صالح. يمكنك نشره بنفسك عبر Vercel بعد تسجيل الدخول، أو إذا رغبت أستطيع مساعدتك في خطوات إضافية للنشر.

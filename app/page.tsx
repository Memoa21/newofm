'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, LayoutDashboard, LogOut, MessageCircle, Plus, Zap } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const statuses = ['للعمل', 'قيد التنفيذ', 'منجز'] as const;
const priorities = ['high', 'medium', 'low'] as const;

type Status = (typeof statuses)[number];
type Priority = (typeof priorities)[number];

type Task = {
  id: string;
  title: string;
  description: string;
  source: string;
  priority: Priority;
  status: Status;
  due_date: string | null;
  created_at: string;
};

const defaultStats = [
  { title: 'المهام الكلية', value: 0 },
  { title: 'المهام المنجزة', value: 0 },
  { title: 'نسبة الإنجاز', value: '0%' },
  { title: 'عالية الأولوية', value: 0 }
];

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '' });

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.status === 'منجز').length;
    const high = tasks.filter((task) => task.priority === 'high').length;
    return [
      { title: 'المهام الكلية', value: total },
      { title: 'المهام المنجزة', value: done },
      { title: 'نسبة الإنجاز', value: total ? `${Math.round((done / total) * 100)}%` : '0%' },
      { title: 'عالية الأولوية', value: high }
    ];
  }, [tasks]);

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      setSession(session);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchTasks();
    } else {
      setTasks([]);
    }
  }, [session]);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', session?.user?.id)
      .order('created_at', { ascending: false });

    setLoading(false);
    if (error) {
      setMessage('حدث خطأ عند تحميل المهام.');
      return;
    }
    setTasks((data ?? []) as Task[]);
  };

  const signIn = async () => {
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setMessage('تعذر إرسال رابط الدخول. تأكد من البريد الإلكتروني.');
    } else {
      setMessage('تم إرسال رابط الدخول إلى بريدك الإلكتروني. تحقق من صندوق الوارد.');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setTasks([]);
  };

  const createTask = async (source: string, payload: Partial<Task>) => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from('tasks').insert([
      {
        user_id: session.user.id,
        title: payload.title ?? 'مهمة جديدة',
        description: payload.description ?? '',
        source,
        priority: payload.priority ?? 'medium',
        status: payload.status ?? 'للعمل',
        due_date: payload.due_date ?? null
      }
    ]);
    if (error) {
      setMessage('فشل إنشاء المهمة.');
      return;
    }
    fetchTasks();
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      setMessage('اكتب عنوانًا للمهمة أولًا.');
      return;
    }
    await createTask('manual', {
      title: newTask.title,
      description: newTask.description,
      due_date: newTask.due_date || null
    });
    setNewTask({ title: '', description: '', due_date: '' });
    setMessage('تمت إضافة المهمة يدويًا.');
  };

  const handleCreateAiTask = async () => {
    if (!aiText.trim()) {
      setMessage('اكتب وصفًا حرًا لتحليل المهمة.');
      return;
    }
    setAiLoading(true);
    setMessage(null);
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: aiText })
    });
    const data = await response.json();
    setAiLoading(false);
    if (!response.ok || data.error) {
      setMessage(data.error || 'فشل تحليل المهمة بواسطة AI.');
      return;
    }
    const parsed = data.result;
    await createTask('ai', {
      title: parsed.title || 'مهمة AI',
      description: parsed.description || aiText,
      priority: ['high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'medium',
      due_date: parsed.due_date || null
    });
    setAiText('');
    setMessage('تمت إضافة المهمة بواسطة الذكاء الاصطناعي.');
  };

  const moveTask = async (taskId: string, newStatus: Status) => {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId).eq('user_id', session?.user?.id);
    if (error) {
      setMessage('تعذر تحديث حالة المهمة.');
      return;
    }
    fetchTasks();
  };

  const planDay = () => {
    const top = tasks.filter((task) => task.priority === 'high' && task.status !== 'منجز');
    setMessage(`خطط يومك: لديك ${top.length} مهمة عالية أولوية تحتاج تركيزًا أولًا.`);
  };

  const stressCheck = () => {
    const urgent = tasks.filter((task) => task.priority === 'high' && task.status !== 'منجز').length;
    setMessage(urgent ? `تنبيه: لديك ${urgent} مهمة عاجلة. ركز على الأولويات العليا.` : 'حالة جيدة: لا توجد مهام عاجلة الآن.');
  };

  const exportCsv = () => {
    const header = ['title,description,source,priority,status,due_date,created_at'];
    const rows = tasks.map((task) =>
      [task.title, task.description, task.source, task.priority, task.status, task.due_date ?? '', task.created_at]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [...header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'tasks.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, taskId: string) => {
    event.dataTransfer.setData('text/plain', taskId);
  };

  const onDrop = async (event: React.DragEvent<HTMLDivElement>, status: Status) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain');
    if (taskId) {
      await moveTask(taskId, status);
    }
  };

  if (!session) {
    return (
      <main className="min-h-screen bg-surface text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-xl">
            <h1 className="text-4xl font-semibold text-slate-900">منصة إدارة المهام الذكية</h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">سجل الدخول لتبدأ تنظيم مهامك الوظيفية، ترتيب الأولويات، وإنشاء خطة يومية بدعم الذكاء الاصطناعي.</p>

            <div className="mt-10 space-y-4">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="بريدك الإلكتروني"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
              />
              <button onClick={signIn} className="inline-flex w-full justify-center rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600">
                إرسال رابط الدخول
              </button>
              <p className="text-sm text-slate-500">ستتلقى رابطًا مباشرًا للدخول عبر البريد الإلكتروني. لا حاجة لكلمة مرور.</p>
              {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">مرحبا، {session.user.email}</p>
            <h1 className="text-3xl font-semibold text-slate-900">لوحة التحكم الذكية</h1>
            <p className="mt-2 text-slate-600">ادِر مهامك الوظيفية الحكومية بترتيب واضح، تحليل أولوية، وخطة يومية.</p>
          </div>
          <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
            <LogOut size={16} /> تسجيل الخروج
          </button>
        </div>

        <section className="mt-8 grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => (
                <div key={item.title} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">{item.title}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">لوحة Kanban</p>
                  <h2 className="text-xl font-semibold text-slate-900">تابع تقدم المهام عبر السحب والإفلات</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                    <LayoutDashboard size={16} /> تصدير CSV
                  </button>
                  <button onClick={planDay} className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600">
                    <Zap size={16} /> خطط يومي
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {statuses.map((status) => (
                  <div
                    key={status}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => onDrop(event, status)}
                    className="rounded-3xl bg-panel p-4"
                  >
                    <p className="text-sm font-semibold text-slate-700">{status}</p>
                    <div className="mt-4 space-y-3">
                      {tasks.filter((task) => task.status === status).map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(event) => onDragStart(event, task.id)}
                          className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:scale-[1.01]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold text-slate-900">{task.title}</p>
                            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-yellow-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {task.priority}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-slate-500">{task.description}</p>
                          <p className="mt-3 text-xs text-slate-400">مصدر: {task.source} • {task.due_date ? `تاريخ التسليم ${task.due_date}` : 'بدون تاريخ'} </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-3">
                <MessageCircle size={20} className="text-accent" />
                <div>
                  <p className="text-sm text-slate-500">مساعد AI</p>
                  <h2 className="text-lg font-semibold text-slate-900">أضف مهمة بنص حر</h2>
                </div>
              </div>
              <textarea
                value={aiText}
                onChange={(event) => setAiText(event.target.value)}
                rows={5}
                placeholder="اكتب مهمتك أو وصف المهمة هنا..."
                className="mt-5 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
              />
              <button onClick={handleCreateAiTask} disabled={aiLoading} className="mt-4 inline-flex w-full items-center justify-center rounded-3xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60">
                {aiLoading ? 'جارٍ المعالجة...' : 'إنشاء مهمة بواسطة AI'}
              </button>
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-slate-700" />
                <div>
                  <p className="text-sm text-slate-500">المهام اليدوية</p>
                  <h2 className="text-lg font-semibold text-slate-900">أضف مهمة جديدة بسرعة</h2>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <input
                  value={newTask.title}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="عنوان المهمة"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                />
                <textarea
                  value={newTask.description}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  placeholder="وصف المهمة"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                />
                <input
                  value={newTask.due_date}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, due_date: event.target.value }))}
                  type="date"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                />
                <button onClick={handleAddTask} className="inline-flex w-full items-center justify-center rounded-3xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  <Plus size={16} /> إضافة مهمة
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">تقارير وإنتاجية</h2>
              <div className="mt-5 grid gap-3">
                <div className="rounded-3xl bg-panel p-4">
                  <p className="text-sm text-slate-500">عدد المهام</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{tasks.length}</p>
                </div>
                <div className="rounded-3xl bg-panel p-4">
                  <p className="text-sm text-slate-500">المهام المنجزة</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{tasks.filter((task) => task.status === 'منجز').length}</p>
                </div>
                <div className="rounded-3xl bg-panel p-4">
                  <p className="text-sm text-slate-500">نسبة الإنجاز</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{stats[2].value}</p>
                </div>
                <div className="rounded-3xl bg-panel p-4">
                  <p className="text-sm text-slate-500">عالية الأولوية</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{stats[3].value}</p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {message ? <div className="mt-6 rounded-3xl bg-emerald-50 p-5 text-slate-900 ring-1 ring-emerald-200">{message}</div> : null}
      </div>
    </main>
  );
}

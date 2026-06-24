import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-1.5-pro';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const text = body.text?.toString().trim();

  if (!text) {
    return NextResponse.json({ error: 'النص مطلوب لتحليل المهمة.' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'مفتاح GOOGLE_API_KEY غير متوفر في الخادم.' }, { status: 500 });
  }

  const prompt = `قم بتحليل الوصف التالي لمهمة وظيفية حكومية. أعد نتيجة JSON فقط بدون أي شرح، واحرص على أن تحتوي الحقول التالية: title, description, source, priority, due_date. إذا لم يكن هناك موعد نهائي، اكتب null. حدد الأولوية بقيم: high أو medium أو low. نص المهمة: "${text.replace(/"/g, '\\"')}"`;

  const response = await fetch(`https://gemini.googleapis.com/v1/models/${GEMINI_MODEL}:generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      prompt: {
        messages: [
          {
            author: 'user',
            content: prompt
          }
        ]
      },
      temperature: 0,
      max_output_tokens: 500
    })
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json({ error: data?.error?.message || 'فشل استدعاء AI.' }, { status: 500 });
  }

  const output = data?.candidates?.[0]?.content?.[0]?.text || data?.output?.[0]?.content?.[0]?.text || '';

  try {
    const payload = JSON.parse(output.trim());
    return NextResponse.json({ result: payload });
  } catch (error) {
    return NextResponse.json({ error: 'لم يتمكن الخادم من تحليل نتيجة AI إلى JSON.' }, { status: 500 });
  }
}

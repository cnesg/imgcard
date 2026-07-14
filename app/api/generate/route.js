export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: '잘못된 요청' }, { status: 400 }); }
  const { src = '', magName = '도시가스 안전 매거진', count = 5 } = body || {};
  if (!src.trim()) return Response.json({ error: '내용(src)이 필요합니다.' }, { status: 400 });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: '서버에 GEMINI_API_KEY가 없습니다.' }, { status: 500 });

  const COPY_RULES = `[카피 규칙]
- 모든 문구는 자연스러운 한국어. 짧은 문장, 명확한 리듬.
- 도입은 스크롤을 멈추게 하는 강한 한 줄.
- 과장, 가짜 전문가 말투 금지. 직설적이되 정제된 톤.
- 통계·수치는 입력 내용에 있는 것만 사용.
- 공포 조장 금지. 차분하고 신뢰감 있게.`;

  let prompt = count === 10 ? 
    `당신은 프리미엄 한국어 카드뉴스 디렉터입니다. 아래 내용을 바탕으로 10장(캐러셀) 구성의 JSON을 만드세요.
${COPY_RULES}
[출력 형식 JSON]
{
  "cover": { "title": "1장 도입", "subtitle": "보조" },
  "bodies": [ { "label": "라벨", "text": "2장내용" }, ... (총 8개) ],
  "closing": { "label": "마무리", "title": "행동유도", "text": "저장유도" },
  "caption": "인스타 캡션", "hashtags": ["#태그1", "#태그2"]
}` 
    : 
    `당신은 프리미엄 한국어 카드뉴스 에디터입니다. 아래 내용을 바탕으로 5컷 구성의 JSON을 만드세요.
${COPY_RULES}
[출력 형식 JSON]
{
  "cover": { "title": "표지 제목", "subtitle": "표지 보조" },
  "bodies": [ { "label": "라벨", "text": "본문" }, { "label": "라벨", "text": "본문" }, { "label": "라벨", "text": "본문" } ],
  "closing": { "label": "마무리", "title": "행동유도", "text": "마무리 문장" },
  "caption": "인스타 캡션", "hashtags": ["#태그1", "#태그2"]
}`;

  prompt += `\n[매거진 이름] ${magName}\n[내용]\n"""${src}"""`;

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }),
    });
    const data = await r.json();
    if (!r.ok) return Response.json({ error: 'Gemini API 오류', detail: data }, { status: r.status });
    
    const text = data.candidates[0].content.parts[0].text;
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

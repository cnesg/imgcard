export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: '잘못된 요청' }, { status: 400 }); }
  const { text = '' } = body || {};

  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: 'GEMINI_API_KEY가 없습니다.' }, { status: 500 });

  // 카드 본문을 바탕으로 영문 이미지 프롬프트 생성 (깔끔하고 모던한 배경 위주)
  const imagePrompt = `A clean, modern, minimalistic background image suitable for a corporate presentation or magazine cover, related to: "${text}". No text, no words in the image. Subtle lighting, high quality, 4k.`;

  try {
    // 참고: 현재 오픈된 Google Cloud / Gemini API 설정에 따라 엔드포인트가 다를 수 있습니다.
    // 아래는 Google의 이미지 생성 표준 REST API(Imagen) 호출 예시입니다.
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: imagePrompt }],
        parameters: { sampleCount: 1 }
      })
    });
    
    const data = await r.json();
    if (!r.ok) return Response.json({ error: 'Image API 오류', detail: data }, { status: r.status });

    // Base64 형태의 이미지 반환
    const base64Image = data.predictions[0].bytesBase64Encoded;
    return Response.json({ imageUrl: `data:image/jpeg;base64,${base64Image}` });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

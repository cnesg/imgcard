// app/api/sheet/route.js
export async function GET() {
  // 제공해주신 구글 시트 ID
  const SHEET_ID = '1Df6NwmQzEMGqmirHg962Y_F3qbuu4DSKo_UkwKfo6_g';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

  try {
    const r = await fetch(url, { cache: 'no-store' });
    const text = await r.text();

    // 구글 시트 Visualization API 응답 파싱 (불필요한 앞뒤 텍스트 잘라내기)
    const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const data = JSON.parse(jsonString);

    const rows = data.table.rows.map(row => {
      // 각 열(Column)의 데이터를 배열로 추출
      const cells = row.c.map(cell => (cell ? cell.v : ''));
      
      // 시트의 정확한 열 구조(A, B, C...)를 몰라도 처리할 수 있도록 
      // 첫 번째 텍스트를 제목으로, 전체를 합친 것을 카피라이팅 재료로 사용합니다.
      return {
        title: cells[0] || '제목 없음',
        content: cells.slice(1).join(' ').trim(),
        fullText: cells.join('\n') // AI에게 넘겨줄 전체 컨텍스트
      };
    });

    // 데이터가 없는 빈 행 제거
    const validRows = rows.filter(r => r.title && r.title !== '제목 없음');

    return Response.json({ items: validRows });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

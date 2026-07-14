'use client';

import { useState, useRef, useEffect } from 'react';

const DEFAULT_CARDS = [
  { type:'cover',  label:'', title:'가스 냄새가 난다면\n3분 안에 이렇게', subtitle:'알아두면 가족을 지키는 수칙', text:'', textColor:'#FFFFFF', bgColor:'#0A1A28', scale:1, image:null },
  { type:'body',   label:'가장 먼저', title:'', subtitle:'', text:'불을 만들지 마세요.\n스위치 하나도 위험합니다.', textColor:'#0B1F2E', bgColor:'#FFFFFF', scale:1, image:null },
  { type:'closing',label:'마무리', title:'평소 습관이\n안전을 만듭니다', subtitle:'', text:'한 달에 한 번 점검해보세요.', textColor:'#FFFFFF', bgColor:'#0A1A28', scale:1, image:null },
];

function CardInner({ c, accent, magName }) {
  const style = { ['--acc']: accent, ['--text-color']: c.textColor };
  const img = c.image ? (<><div className="cimg" style={{ backgroundImage: `url(${c.image})` }} /><div className="cshade" /></>) : null;
  
  if (c.type === 'cover') return (<>{img}<div className="ci" style={style}><div className="ctop">{magName}</div><div className="spacer" /><div className="barline" /><div className="ctitle">{c.title}</div><div className="csub">{c.subtitle}</div></div></>);
  if (c.type === 'closing') return (<>{img}<div className="ci" style={style}><div className="clabel">{c.label}</div><div className="ctitle">{c.title}</div><div className="csub">{c.text}</div><div className="spacer" /><div className="cfoot">{magName}</div></div></>);
  
  return (<>{img}<div className="ci" style={style}><div className="clabel">{c.label}</div><div className="ctext">{c.text}</div><div className="spacer" /><div className="cfoot">{magName}</div></div></>);
}

export default function Page() {
  const [activeTab, setActiveTab] = useState('sheet'); // 'search', 'sheet', 'manual', 'review'
  
  // Settings & Data
  const [magName, setMagName] = useState('도시가스 안전 매거진');
  const [accent, setAccent] = useState('#00AEEF');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [sheetItems, setSheetItems] = useState([]); // 구글 시트 데이터
  const [cards, setCards] = useState(DEFAULT_CARDS);
  const [manualText, setManualText] = useState('');
  
  const [generating, setGenerating] = useState(false);
  const [loadingImages, setLoadingImages] = useState({});
  const stageRef = useRef(null);

  // 구글 시트 데이터 불러오기
  const loadSheetData = async () => {
    setActiveTab('sheet');
    if (sheetItems.length > 0) return; // 이미 불러온 경우 스킵
    
    setGenerating(true); // 로딩 스피너 역할
    try {
      const res = await fetch('/api/sheet');
      const data = await res.json();
      setSheetItems(data.items || []);
    } catch (e) {
      alert('시트 불러오기 실패: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  // 초기 렌더링 시 구글 시트 데이터 자동 로드
  useEffect(() => {
    loadSheetData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 뉴스 검색
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/news?query=${encodeURIComponent(searchQuery)}&start=1&sort=sim`);
      const data = await res.json();
      setResults(data.items || []);
    } catch(e) {
      alert('검색 실패: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  // 텍스트 기반 카드 생성 (제미나이 호출)
  const generateCards = async (sourceText) => {
    if (!sourceText) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src: sourceText, magName, count: 5 }),
      });
      const data = await res.json();
      const j = JSON.parse(data.text);
      
      const bodies = Array.isArray(j.bodies) ? j.bodies : [];
      setCards([
        { type: 'cover', title: j.cover?.title || '', subtitle: j.cover?.subtitle || '', text: '', textColor: '#FFFFFF', bgColor: '#0A1A28', image: null },
        ...bodies.map((b) => ({ type: 'body', label: b.label || '', title: '', subtitle: '', text: b.text || '', textColor: '#0B1F2E', bgColor: '#FFFFFF', image: null })),
        { type: 'closing', label: j.closing?.label || '마무리', title: j.closing?.title || '', text: j.closing?.text || '', textColor: '#FFFFFF', bgColor: '#0A1A28', image: null },
      ]);
      setActiveTab('review'); // 생성 후 리뷰 보드로 이동
    } catch (e) {
      alert('생성 실패: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  // AI 배경 이미지 생성 (제미나이 호출)
  const generateImageForCard = async (index) => {
    const card = cards[index];
    const promptText = card.type === 'cover' ? card.title : card.text || card.title;
    
    setLoadingImages(prev => ({ ...prev, [index]: true }));
    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: promptText }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        updateCard(index, { image: data.imageUrl });
      } else {
        alert('이미지 생성 오류');
      }
    } catch (e) {
      alert('실패: ' + e.message);
    } finally {
      setLoadingImages(prev => ({ ...prev, [index]: false }));
    }
  };

  const updateCard = (i, patch) => setCards(cs => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  // PNG 저장 로직
  async function downloadOne(i) {
    const html2canvas = (await import('html2canvas')).default;
    const original = document.getElementById('card-' + i);
    const clone = original.cloneNode(true);
    const stage = stageRef.current;
    stage.innerHTML = ''; stage.appendChild(clone);
    const canvas = await html2canvas(clone, { width: 1080, height: 1350, scale: 1, backgroundColor: null, useCORS: true });
    stage.innerHTML = '';
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = `card_${i+1}.png`; a.click();
  }

  // 뷰포트 스케일 계산용
  const [scale, setScale] = useState(0.25);
  useEffect(() => {
    const updateScale = () => {
      const el = document.querySelector('.card-viewport');
      if (el) setScale(el.clientWidth / 1080);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [activeTab]);

  return (
    <div className="layout">
      {/* 왼쪽 사이드바 */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <svg width="24" height="24" viewBox="0 0 38 34" fill="none"><circle cx="12" cy="21" r="11" fill="#00AEEF" /><circle cx="32" cy="8" r="5" fill="#00AEEF" /></svg>
          AI Creative Agent
        </div>
        <div className="nav-menu">
          <div className={`nav-item ${activeTab === 'sheet' ? 'active' : ''}`} onClick={loadSheetData}>🏢 자사 뉴스 (자동적재)</div>
          <div className={`nav-item ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>🔍 네이버 뉴스 검색</div>
          <div className={`nav-item ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveTab('manual')}>✍️ 텍스트 직접 입력</div>
          <div className={`nav-item ${activeTab === 'review' ? 'active' : ''}`} onClick={() => setActiveTab('review')}>🎨 카드뉴스 리뷰 보드</div>
        </div>
      </div>

      {/* 우측 메인 컨텐츠 영역 */}
      <div className="main-area">
        <div className="top-header">
          {activeTab === 'search' && (
            <form className="search-bar-wrap" onSubmit={handleSearch}>
              <input type="text" placeholder="검색어를 입력하세요 (예: 대전 도시가스 안전)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <button type="submit" className="btn brand sm">검색</button>
            </form>
          )}
          {activeTab === 'sheet' && <div><b>자동으로 적재된 자사 뉴스 리스트입니다.</b></div>}
          {activeTab === 'manual' && <div><b>카드뉴스 텍스트 직접 입력</b></div>}
          {activeTab === 'review' && <div><b>생성된 카드뉴스 리뷰 및 편집</b></div>}
        </div>

        <div className="content-scroll">
          {generating && <div style={{textAlign:'center', padding:'50px'}}><b>데이터를 불러오거나 카드를 생성하는 중입니다... ⏳</b></div>}
          
          {/* 구글 시트 연동 탭 */}
          {!generating && activeTab === 'sheet' && (
            <div className="news-grid">
              {sheetItems.length === 0 ? <p style={{color:'#666'}}>시트에 데이터가 없거나 불러오지 못했습니다.</p> : sheetItems.map((it, idx) => (
                <div className="news-card" key={idx} onClick={() => generateCards(it.fullText)}>
                  {/* 시트의 첫 번째 열을 제목으로 출력 */}
                  <div className="nt">{String(it.title).substring(0, 60)}</div>
                  {/* 나머지 열을 요약으로 출력 */}
                  <div className="nd">{String(it.content).substring(0, 100)}...</div>
                  <div style={{marginTop: '12px', fontSize: '12px', color: 'var(--brand)'}}>이 기사로 생성하기 →</div>
                </div>
              ))}
            </div>
          )}

          {/* 기사 검색 탭 */}
          {!generating && activeTab === 'search' && (
            <div className="news-grid">
              {results.length === 0 ? <p style={{color:'#666'}}>상단 검색창에서 기사를 검색해보세요.</p> : results.map((it, idx) => (
                <div className="news-card" key={idx} onClick={() => generateCards(it.title + ' ' + it.summary)}>
                  <div className="nt">{it.title.replace(/<[^>]+>/g, '')}</div>
                  <div className="nd">{it.summary.replace(/<[^>]+>/g, '')}</div>
                  <div style={{marginTop: '12px', fontSize: '12px', color: 'var(--brand)'}}>이 기사로 생성하기 →</div>
                </div>
              ))}
            </div>
          )}

          {/* 직접 입력 탭 */}
          {!generating && activeTab === 'manual' && (
            <div className="panel" style={{maxWidth:'800px', margin:'0 auto'}}>
              <h2 className="title">내용을 직접 입력하여 생성하기</h2>
              <textarea rows={8} value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="카드뉴스로 만들 내용을 자유롭게 적어주세요." />
              <div style={{marginTop:'16px', textAlign:'right'}}>
                <button className="btn brand" onClick={() => generateCards(manualText)}>AI로 카드뉴스 생성하기</button>
              </div>
            </div>
          )}

          {/* 리뷰 보드 (결과물) 탭 */}
          {!generating && activeTab === 'review' && (
            <div className="cards-grid">
              {cards.map((c, i) => (
                <div className="card-wrap" key={i}>
                  <div className="card-viewport">
                    <div className="card-scaler" style={{ transform: `scale(${scale})` }}>
                      <div className={`card ${c.type}`} id={`card-${i}`} style={{ background: c.bgColor }}>
                        <CardInner c={c} accent={accent} magName={magName} />
                      </div>
                    </div>
                  </div>
                  <div className="editor-panel">
                    {c.type === 'cover' ? (
                      <><span className="lab">제목</span><input type="text" value={c.title} onChange={(e) => updateCard(i, { title: e.target.value })}/></>
                    ) : (
                      <><span className="lab">본문</span><textarea rows={2} value={c.text} onChange={(e) => updateCard(i, { text: e.target.value })}/></>
                    )}
                    <div className="ctl-row">
                      <button className="btn brand sm" onClick={() => generateImageForCard(i)} disabled={loadingImages[i]}>
                        {loadingImages[i] ? '생성 중..' : '✨ AI 배경 생성'}
                      </button>
                      <button className="btn ghost sm" onClick={() => downloadOne(i)}>PNG 저장</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="render-stage" ref={stageRef} />
    </div>
  );
}

import { useState, useEffect, useRef } from "react";

const ALL_CONTENT = [
  { id:"c1",  title:"Apex Protocol",       emoji:"🔥", genre:"Action",      type:"Movie",  score:9.1, year:2026, lang:"EN/HI/TA", tags:["4K","HDR"],   accent:"#e50914", desc:"An elite soldier must stop a rogue AI in 48 hours."           },
  { id:"c2",  title:"Dark Meridian",        emoji:"🌌", genre:"Sci-Fi",      type:"Series", score:8.8, year:2026, lang:"EN/HI",    tags:["HDR"],         accent:"#1d9bf0", desc:"A wormhole researcher discovers reality has a kill switch."    },
  { id:"c3",  title:"Bombay Central",       emoji:"🏙️", genre:"Drama",       type:"Movie",  score:8.5, year:2025, lang:"HI/EN",   tags:["4K","Dolby"],  accent:"#f59e0b", desc:"Three strangers collide at a Mumbai railway station."          },
  { id:"c4",  title:"IPL 2026 Finals",      emoji:"🏏", genre:"Cricket",     type:"Live",   score:0,   year:2026, lang:"HI/EN/TA", tags:["LIVE","4K"],   accent:"#00c853", desc:"LIVE: Mumbai Indians vs Chennai Super Kings!"                 },
  { id:"c5",  title:"Steel Horizon",        emoji:"🤖", genre:"Action",      type:"Series", score:8.6, year:2026, lang:"EN/HI",    tags:["HD"],          accent:"#64748b", desc:"A mechanized police unit goes rogue in a smart city."         },
  { id:"c6",  title:"Rang De Basanti 2",    emoji:"🎭", genre:"Drama",       type:"Movie",  score:9.0, year:2025, lang:"HI/EN",   tags:["4K","Award"],  accent:"#f59e0b", desc:"A new generation rises to avenge a forgotten martyr."         },
  { id:"c7",  title:"Quantum Cascade",      emoji:"⚡", genre:"Thriller",    type:"Movie",  score:8.3, year:2026, lang:"EN",       tags:["HDR"],         accent:"#a855f7", desc:"A physicist holds the key to breaking all encryption."        },
  { id:"c8",  title:"Chhota Bheem Returns", emoji:"🦸", genre:"Kids",        type:"Series", score:8.0, year:2026, lang:"HI/EN/TA", tags:["HD"],          accent:"#84cc16", desc:"Bheem faces the most powerful villain in Dholakpur!"         },
  { id:"c9",  title:"Deep Margin",          emoji:"🌊", genre:"Documentary", type:"Doc",    score:4.9, year:2025, lang:"EN/HI",   tags:["4K","Award"],  accent:"#38bdf8", desc:"90 days inside the last uncharted deep-sea research station." },
  { id:"c10", title:"Neon Karma",           emoji:"💫", genre:"Romance",     type:"Movie",  score:7.9, year:2026, lang:"HI",       tags:["HD"],          accent:"#ec4899", desc:"Two rival musicians discover they were always meant to meet."  },
  { id:"c11", title:"Formula X Monaco",     emoji:"🏎️", genre:"Racing",      type:"Live",   score:0,   year:2026, lang:"EN/HI",   tags:["LIVE","4K"],   accent:"#e50914", desc:"LIVE: Final 10 laps, gap under 0.3 seconds!"                 },
  { id:"c12", title:"India Today Live",     emoji:"📺", genre:"News",        type:"Live",   score:0,   year:2026, lang:"EN/HI",   tags:["LIVE","HD"],   accent:"#f97316", desc:"24/7 breaking news coverage from across India."              },
  { id:"c13", title:"Hollow Crown",         emoji:"👑", genre:"Drama",       type:"Series", score:8.4, year:2025, lang:"EN",       tags:["HD"],          accent:"#c084fc", desc:"A deposed monarch rebuilds power in the shadows."            },
  { id:"c14", title:"Blood Static",         emoji:"👻", genre:"Horror",      type:"Movie",  score:7.8, year:2026, lang:"EN",       tags:["HD"],          accent:"#f87171", desc:"Signals from a dead broadcast network resurrect something."   },
  { id:"c15", title:"Pro Kabaddi League",   emoji:"🤸", genre:"Kabaddi",     type:"Live",   score:0,   year:2026, lang:"HI/EN",   tags:["LIVE","HD"],   accent:"#a855f7", desc:"Live match — Patna Pirates vs Jaipur Pink Panthers."        },
];

const GENRES  = ["All","Action","Drama","Sci-Fi","Thriller","Horror","Romance","Comedy","Kids","Sports","Documentary","News"];
const TYPES   = ["All","Movie","Series","Live","Doc"];
const SORTS   = ["Relevance","Top Rated","Most Popular","Newest"];
const TRENDING = ["IPL Finals","Apex Protocol","Dark Meridian","Rang De Basanti","Chhota Bheem"];

export default function Search({ onPlay, onClose }) {
  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState([]);
  const [genre,      setGenre]      = useState("All");
  const [type,       setType]       = useState("All");
  const [sort,       setSort]       = useState("Relevance");
  const [loading,    setLoading]    = useState(false);
  const [searched,   setSearched]   = useState(false);
  const [history,    setHistory]    = useState(() => {
    try { return JSON.parse(localStorage.getItem("sx_search_history") || "[]"); }
    catch { return []; }
  });

  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, genre, type, sort]);

  function doSearch(q) {
    setLoading(true);
    setSearched(true);

    // Simulate API delay
    setTimeout(() => {
      let filtered = ALL_CONTENT.filter(c => {
        const matchQ = q === "" ||
          c.title.toLowerCase().includes(q.toLowerCase()) ||
          c.genre.toLowerCase().includes(q.toLowerCase()) ||
          c.desc.toLowerCase().includes(q.toLowerCase()) ||
          c.lang.toLowerCase().includes(q.toLowerCase());
        const matchG = genre === "All" || c.genre === genre;
        const matchT = type  === "All" || c.type  === type;
        return matchQ && matchG && matchT;
      });

      // Sort
      if (sort === "Top Rated")    filtered.sort((a,b) => b.score - a.score);
      if (sort === "Most Popular") filtered.sort((a,b) => (b.score*1000) - (a.score*1000));
      if (sort === "Newest")       filtered.sort((a,b) => b.year - a.year);

      setResults(filtered);
      setLoading(false);
    }, 400);
  }

  function saveToHistory(q) {
    if (!q.trim()) return;
    const updated = [q, ...history.filter(h => h !== q)].slice(0, 8);
    setHistory(updated);
    localStorage.setItem("sx_search_history", JSON.stringify(updated));
  }

  function handleSearch(q) {
    setQuery(q);
    if (q.trim().length > 1) saveToHistory(q);
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem("sx_search_history");
  }

  const showHome = !searched || query.trim().length < 2;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 600,
      background: "#07070c",
      display: "flex", flexDirection: "column",
      fontFamily: "Inter, sans-serif",
    }}>

      {/* Search bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 20px",
        background: "#0f0f18",
        borderBottom: "1px solid #1a1a26",
      }}>
        <button onClick={onClose} style={{
          background: "none", border: "none",
          color: "#fff", fontSize: 20, cursor: "pointer",
          flexShrink: 0,
        }}>←</button>

        <div style={{
          flex: 1, display: "flex", alignItems: "center",
          background: "#1a1a26", borderRadius: 10,
          padding: "0 14px", gap: 10,
        }}>
          <span style={{ color: "#555", fontSize: 16 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search movies, shows, sports..."
            style={{
              flex: 1, background: "none", border: "none",
              color: "#fff", fontSize: 15, outline: "none",
              padding: "12px 0",
              fontFamily: "Inter, sans-serif",
            }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); setSearched(false); }} style={{
              background: "none", border: "none",
              color: "#555", fontSize: 18, cursor: "pointer",
            }}>✕</button>
          )}
        </div>
      </div>

      {/* Filters — show when searching */}
      {!showHome && (
        <div style={{
          display: "flex", gap: 8, padding: "10px 20px",
          overflowX: "auto", background: "#0a0a0f",
          borderBottom: "1px solid #1a1a26",
        }}>
          {/* Type filter */}
          <select
            value={type} onChange={e => setType(e.target.value)}
            style={{
              background: "#1a1a26", border: "1px solid #2a2a36",
              color: "#fff", borderRadius: 20, padding: "5px 12px",
              fontSize: 12, cursor: "pointer", outline: "none",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Genre filter */}
          <select
            value={genre} onChange={e => setGenre(e.target.value)}
            style={{
              background: "#1a1a26", border: "1px solid #2a2a36",
              color: "#fff", borderRadius: 20, padding: "5px 12px",
              fontSize: 12, cursor: "pointer", outline: "none",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          {/* Sort */}
          <select
            value={sort} onChange={e => setSort(e.target.value)}
            style={{
              background: "#1a1a26", border: "1px solid #2a2a36",
              color: "#fff", borderRadius: 20, padding: "5px 12px",
              fontSize: 12, cursor: "pointer", outline: "none",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {SORTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Results count */}
          {!loading && (
            <div style={{
              marginLeft: "auto", fontSize: 12, color: "#555",
              whiteSpace: "nowrap", display: "flex", alignItems: "center",
            }}>
              {results.length} result{results.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {/* Content area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

        {/* HOME STATE — no search yet */}
        {showHome && (
          <div>
            {/* Trending searches */}
            <div style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 12, color: "#555", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 1,
                marginBottom: 12,
              }}>🔥 Trending Searches</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {TRENDING.map(t => (
                  <button key={t} onClick={() => handleSearch(t)} style={{
                    background: "#1a1a26", border: "1px solid #2a2a36",
                    color: "#aaa", borderRadius: 20,
                    padding: "7px 16px", fontSize: 13,
                    cursor: "pointer", transition: "all .2s",
                  }}>🔍 {t}</button>
                ))}
              </div>
            </div>

            {/* Search history */}
            {history.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 12,
                }}>
                  <div style={{
                    fontSize: 12, color: "#555", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: 1,
                  }}>🕐 Recent Searches</div>
                  <button onClick={clearHistory} style={{
                    background: "none", border: "none",
                    color: "#e50914", fontSize: 12, cursor: "pointer",
                  }}>Clear all</button>
                </div>
                {history.map(h => (
                  <div key={h} onClick={() => handleSearch(h)} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 0", borderBottom: "1px solid #1a1a2611",
                    cursor: "pointer",
                  }}>
                    <span style={{ color: "#555", fontSize: 14 }}>🕐</span>
                    <span style={{ flex: 1, fontSize: 14, color: "#aaa" }}>{h}</span>
                    <button onClick={e => {
                      e.stopPropagation();
                      const updated = history.filter(x => x !== h);
                      setHistory(updated);
                      localStorage.setItem("sx_search_history", JSON.stringify(updated));
                    }} style={{
                      background: "none", border: "none",
                      color: "#333", fontSize: 14, cursor: "pointer",
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Browse by genre */}
            <div>
              <div style={{
                fontSize: 12, color: "#555", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 1,
                marginBottom: 12,
              }}>🎬 Browse by Genre</div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
              }}>
                {[
                  { g:"Action",      emoji:"💥", col:"#e50914" },
                  { g:"Drama",       emoji:"🎭", col:"#f59e0b" },
                  { g:"Sci-Fi",      emoji:"🚀", col:"#1d9bf0" },
                  { g:"Thriller",    emoji:"🔪", col:"#a855f7" },
                  { g:"Horror",      emoji:"👻", col:"#f87171" },
                  { g:"Romance",     emoji:"💕", col:"#ec4899" },
                  { g:"Kids",        emoji:"🧸", col:"#84cc16" },
                  { g:"Sports",      emoji:"🏆", col:"#00c853" },
                  { g:"Documentary", emoji:"🎥", col:"#38bdf8" },
                  { g:"News",        emoji:"📺", col:"#f97316" },
                ].map(({ g, emoji, col }) => (
                  <div key={g} onClick={() => { setGenre(g); setQuery(g); }}
                    style={{
                      background: `${col}18`,
                      border: `1px solid ${col}33`,
                      borderRadius: 10, padding: "14px 16px",
                      cursor: "pointer", textAlign: "center",
                      transition: "all .2s",
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: col }}>{g}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "center", flexDirection: "column",
            gap: 16, padding: 60,
          }}>
            <div style={{
              width: 40, height: 40,
              border: "3px solid #1a1a26",
              borderTop: "3px solid #e50914",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}/>
            <div style={{ color: "#555", fontSize: 13 }}>
              Searching for "{query}"...
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
          </div>
        )}

        {/* NO RESULTS */}
        {!loading && searched && results.length === 0 && (
          <div style={{
            textAlign: "center", padding: 60,
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
            <div style={{
              fontSize: 18, fontWeight: 700,
              marginBottom: 8,
            }}>No results found</div>
            <div style={{ color: "#555", fontSize: 14, marginBottom: 24 }}>
              No results for "{query}".<br/>
              Try a different keyword or browse by genre.
            </div>
            <button onClick={() => { setQuery(""); setGenre("All"); setType("All"); }} style={{
              background: "#e50914", color: "#fff", border: "none",
              borderRadius: 8, padding: "10px 24px",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>Clear Search</button>
          </div>
        )}

        {/* RESULTS */}
        {!loading && results.length > 0 && (
          <div>
            <div style={{
              fontSize: 12, color: "#555", marginBottom: 16,
              fontWeight: 600,
            }}>
              {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 14,
            }}>
              {results.map(item => (
                <SearchCard key={item.id} item={item} onPlay={onPlay}/>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchCard({ item, onPlay }) {
  const [hov, setHov] = useState(false);
  const isLive = item.tags.includes("LIVE");

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onPlay(item)}
      style={{
        background: "#0f0f18",
        border: `1.5px solid ${hov ? item.accent + "88" : "#1a1a26"}`,
        borderRadius: 10, overflow: "hidden",
        cursor: "pointer",
        transform: hov ? "scale(1.04) translateY(-3px)" : "scale(1)",
        transition: "all .22s",
        boxShadow: hov ? `0 10px 30px ${item.accent}22` : "none",
      }}
    >
      {/* Thumbnail */}
      <div style={{
        height: 100, fontSize: 40,
        background: `linear-gradient(135deg, ${item.accent}22, #0a0a0f)`,
        display: "flex", alignItems: "center",
        justifyContent: "center", position: "relative",
      }}>
        {item.emoji}
        {isLive && (
          <div style={{
            position: "absolute", top: 6, left: 6,
            background: "#e50914", color: "#fff",
            fontSize: 9, fontWeight: 800,
            padding: "2px 7px", borderRadius: 3, letterSpacing: 2,
          }}>● LIVE</div>
        )}
        <div style={{
          position: "absolute", top: 6, right: 6,
          background: "rgba(0,0,0,.7)", color: "#aaa",
          fontSize: 9, padding: "2px 6px",
          borderRadius: 3, fontWeight: 600,
        }}>{item.type}</div>
        {hov && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "flex", alignItems: "center",
            justifyContent: "center",
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: item.accent,
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 14,
            }}>▶</div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}>
          {item.title}
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 4,
        }}>
          <span style={{ fontSize: 10, color: item.accent, fontWeight: 600 }}>
            {item.genre}
          </span>
          {item.score > 0 && (
            <span style={{ fontSize: 10, color: "#f59e0b" }}>
              ★ {item.score}
            </span>
          )}
        </div>
        <div style={{ fontSize: 10, color: "#555" }}>
          {item.year} · {item.lang}
        </div>
      </div>
    </div>
  );
}
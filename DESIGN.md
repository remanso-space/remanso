# Remanso — Design (QFD)

Goal-driven design for what Remanso is _for_: a **beautiful, primarily read-only** viewer for notes authored in the IDE (git push) and read as a Matuschak-style stacked-notes web — built to make notes feel **good-looking**, to evoke **pride and peace** (including reading _gracefully on a flaky mobile/metro connection_), and to **lower every wall** to making your voice public. Relies on [CONTEXT.md](CONTEXT.md) for vocabulary (Note, Path, SHA, Backlink, Igarapé, Stacked Notes, Live/Snapshot reference, Published Note, Publish), [ADR-0001](docs/adr/0001-note-identity-is-path.md) (Note identity = Path) and [ADR-0002](docs/adr/0002-two-reference-modes.md) (Live vs Snapshot reference). The earlier "Path↔SHA resolution layer" is not a goal in itself — it folds in under Peace (live references that never break) and integrity (immutable Snapshot references).

Strength weights used in matrices: **9** strong, **3** medium, **1** weak, blank none.

---

## House of Quality

```tikz
\usetikzlibrary{arrows.meta, positioning, shapes.geometric, shapes.misc, calc, fit, backgrounds}

% Toggles
\newif\ifqfdshowroof          \qfdshowrooftrue
\newif\ifqfdshowbasement      \qfdshowbasementtrue
\newif\ifqfdshowcompetitive   \qfdshowcompetitivetrue
\newif\ifqfdshowlegend        \qfdshowlegendtrue
\newif\ifqfdshowimportance    \qfdshowimportancetrue
\newif\ifqfdshowcorrlegend    \qfdshowcorrlegendtrue
\newif\ifqfdshowevallegend    \qfdshowevallegendtrue
\newif\ifqfdshowtitle         \qfdshowtitletrue

% Dimensions
\def\qfdNW{5}
\def\qfdNH{5}
\def\qfdWhatW{4.0}
\def\qfdImpW{0.9}
\def\qfdCmpW{3}
\def\qfdHdrH{2.6}
\def\qfdBasementN{4}

% Titles & labels
\def\qfdWhatsTitle{Customer needs}
\def\qfdImpTitle{Imp.\ \%}
\def\qfdPerceptionTitle{Comparative evaluation}
\def\qfdPoorLabel{poor}
\def\qfdExcellentLabel{excellent}
\def\qfdAltOneLabel{Our product}
\def\qfdAltTwoLabel{Competitor A}
\def\qfdAltThreeLabel{Competitor B}
\def\qfdRelTitle{Relation}
\def\qfdCorrTitle{Correlation}
\def\qfdEvalTitle{Evaluation}

\def\qfdProjectTitle{}
\def\qfdConcept{}

\tikzset{
  qfdthin/.style ={line width=0.35pt},
  qfdmed/.style  ={line width=0.7pt},
  qfdstrong/.style={circle, draw, fill=black, minimum size=7pt, inner sep=0pt},
  qfdmod/.style  ={circle, draw, minimum size=7pt, inner sep=0pt, line width=0.8pt},
  qfdweak/.style ={regular polygon, regular polygon sides=3, draw, minimum size=8.5pt, inner sep=0pt, line width=0.7pt},
  qfdrel/.is choice,
  qfdrel/S/.style={qfdstrong},
  qfdrel/M/.style={qfdmod},
  qfdrel/W/.style={qfdweak},
  qfdalt1mk/.style={circle, draw, fill=black, minimum size=6pt, inner sep=0pt, line width=1pt},
  qfdalt1ln/.style={line width=1.2pt},
  qfdalt2mk/.style={regular polygon, regular polygon sides=3, draw, fill=black, minimum size=6pt, inner sep=0pt, line width=0.7pt},
  qfdalt2ln/.style={line width=0.7pt, dashed},
  qfdalt3mk/.style={rectangle, draw, fill=black, minimum size=5pt, inner sep=0pt, line width=0.7pt},
  qfdalt3ln/.style={line width=0.7pt, dotted},
}

\newcommand{\qfdDrawGrid}{%
  \foreach \c in {1,...,\qfdNHm} \draw[qfdthin] (\c, 0) -- (\c, -\qfdNW);
  \foreach \r in {1,...,\qfdNWm} \draw[qfdthin] (0, -\r) -- (\qfdNH, -\r);
  \foreach \r in {1,...,\qfdNWm} \draw[qfdthin] (\qfdLeftEdge, -\r) -- (0, -\r);
  \ifqfdshowroof
    \foreach \c in {1,...,\qfdNHm} \draw[qfdthin] (\c, 0) -- (\c, \qfdHdrH);
  \fi
  \ifqfdshowcompetitive
    \foreach \r in {1,...,\qfdNWm} \draw[qfdthin] (\qfdNH, -\r) -- (\qfdNH+\qfdCmpW, -\r);
  \fi
  \ifqfdshowbasement
    \foreach \r in {1,...,\qfdBasementN} \draw[qfdthin] (0, -\qfdNW-\r) -- (\qfdNH, -\qfdNW-\r);
    \foreach \c in {1,...,\qfdNHm} \draw[qfdthin] (\c, -\qfdNW) -- (\c, -\qfdNW-\qfdBasementN);
  \fi
}

\newcommand{\qfdDrawRoof}{%
  \ifqfdshowroof
    \foreach \k in {1,...,\qfdNHm} {%
      \pgfmathsetmacro{\rx}{(\k+\qfdNH)/2}
      \pgfmathsetmacro{\ry}{\qfdHdrH + (\qfdNH-\k)/2}
      \pgfmathsetmacro{\lx}{\k/2}
      \pgfmathsetmacro{\ly}{\qfdHdrH + \k/2}
      \draw[qfdthin] (\k, \qfdHdrH) -- (\rx, \ry);
      \draw[qfdthin] (\k, \qfdHdrH) -- (\lx, \ly);
    }%
    \draw[qfdmed] (0, \qfdHdrH) -- (\qfdNH/2, \qfdApexY) -- (\qfdNH, \qfdHdrH);
    \foreach \i in {1,...,\qfdNH}
      \foreach \k in {1,...,\qfdNH} {%
        \pgfmathtruncatemacro{\jj}{\i+\k}
        \ifnum\jj>\qfdNH\relax\else
          \pgfmathsetmacro{\xx}{\i + \k/2 - 0.5}
          \pgfmathsetmacro{\yy}{\qfdHdrH + \k/2}
          \coordinate (C-\i-\jj) at (\xx, \yy);
        \fi
      }%
  \fi
}

\newcommand{\qfdDrawScale}{%
  \ifqfdshowcompetitive
    \foreach \tk in {0,1,2,3,4,5} {%
      \pgfmathsetmacro{\tx}{\qfdNH + (\tk+0.5)*\qfdCmpW/6}
      \node[anchor=south, font=\scriptsize] at (\tx, 0.02) {\tk};
    }%
    \node[anchor=south, font=\scriptsize\bfseries, align=center] at ({\qfdNH + \qfdCmpW/2}, 0.7) {\qfdPerceptionTitle};
    \node[anchor=north, font=\scriptsize\itshape] at ({\qfdNH + 0.45}, -\qfdNW) {\qfdPoorLabel};
    \node[anchor=north, font=\scriptsize\itshape] at ({\qfdNH + \qfdCmpW - 0.45}, -\qfdNW) {\qfdExcellentLabel};
  \fi
}

\newcommand{\qfdDrawZoneTitles}{%
  \ifqfdshowimportance
    \node[rotate=90, anchor=west, font=\footnotesize\bfseries] at ({-\qfdImpW/2}, 0.12) {\qfdImpTitle};
  \fi
  \node[font=\scriptsize\bfseries, align=center, text width=\qfdWhatW cm] at ({\qfdLeftEdge + \qfdWhatW/2}, {\ifqfdshowroof \qfdHdrH/2 \else 0.6 \fi}) {\qfdWhatsTitle};
}

\newcommand{\qfdDrawTitle}{%
  \ifqfdshowtitle
    \ifx\qfdProjectTitle\empty\else
      \pgfmathsetmacro{\qfdTitleX}{\qfdNH/2}
      \pgfmathsetmacro{\qfdTitleY}{\ifqfdshowroof \qfdApexY \else \qfdHdrH \fi + 0.9}
      \pgfmathsetmacro{\qfdSubW}{\qfdNH + 2}
      \node[anchor=south, font=\large\bfseries, align=center] at (\qfdTitleX, \qfdTitleY) {\qfdProjectTitle};
      \ifx\qfdConcept\empty\else
        \node[anchor=north, font=\footnotesize\itshape, align=center, text width=\qfdSubW cm] at (\qfdTitleX, {\qfdTitleY - 0.1}) {\qfdConcept};
      \fi
    \fi
  \fi
}

\newcommand{\qfdDrawFrames}{%
  \begin{scope}[qfdmed]
    \draw (\qfdLeftEdge, 0) rectangle (\qfdNH, -\qfdNW);
    \ifqfdshowimportance \draw (-\qfdImpW, 0) -- (-\qfdImpW, -\qfdNW); \fi
    \draw (0, 0) -- (0, -\qfdNW);
    \ifqfdshowroof \draw (0, 0) rectangle (\qfdNH, \qfdHdrH); \fi
    \ifqfdshowbasement \draw (0, -\qfdNW) rectangle (\qfdNH, -\qfdNW-\qfdBasementN); \fi
    \ifqfdshowcompetitive \draw (\qfdNH, 0) rectangle (\qfdNH+\qfdCmpW, -\qfdNW); \fi
  \end{scope}
}

\newcommand{\qfdDrawLegend}{%
  \ifqfdshowlegend
    \pgfmathsetmacro{\qfdLegX}{\qfdNH + \ifqfdshowcompetitive \qfdCmpW + 0.7 \else 0.7 \fi}
    \pgfmathsetmacro{\qfdLegBottom}{-2.05 \ifqfdshowroof \ifqfdshowcorrlegend - 2.55 \fi \fi \ifqfdshowcompetitive \ifqfdshowevallegend - 2.20 \fi \fi}
    \pgfmathsetmacro{\qfdLegY}{\qfdHdrH - 0.4}
    \begin{scope}[shift={(\qfdLegX, \qfdLegY)}]
      \draw[qfdmed, rounded corners=2pt] (-0.15, 0.4) rectangle (4.5, \qfdLegBottom);
      \node[anchor=west, font=\footnotesize\bfseries] at (0, 0.1) {\qfdRelTitle};
      \draw[qfdthin] (0, -0.15) -- (4.35, -0.15);
      \node[qfdstrong] at (0.22, -0.5)  {}; \node[anchor=west] at (0.5, -0.5)  {Strong (9)};
      \node[qfdmod]    at (0.22, -0.95) {}; \node[anchor=west] at (0.5, -0.95) {Medium (3)};
      \node[qfdweak]   at (0.22, -1.4)  {}; \node[anchor=west] at (0.5, -1.4)  {Weak (1)};
      \ifqfdshowroof \ifqfdshowcorrlegend
        \node[anchor=west, font=\footnotesize\bfseries] at (0, -2.10) {\qfdCorrTitle};
        \draw[qfdthin] (0, -2.35) -- (4.35, -2.35);
        \node[anchor=west] at (0, -2.70) {{$+\!+$}\quad very positive};
        \node[anchor=west] at (0, -3.05) {{$+$\phantom{$+$}}\quad positive};
        \node[anchor=west] at (0, -3.40) {{$-$\phantom{$-$}}\quad negative};
        \node[anchor=west] at (0, -3.75) {{$-\!-$}\quad very negative};
      \fi \fi
      \ifqfdshowcompetitive \ifqfdshowevallegend
        \pgfmathsetmacro{\qfdEvalTop}{-2.10 \ifqfdshowroof\ifqfdshowcorrlegend - 2.55 \fi\fi}
        \node[anchor=west, font=\footnotesize\bfseries] at (0, \qfdEvalTop) {\qfdEvalTitle};
        \pgfmathsetmacro{\qfdEvalSep}{\qfdEvalTop - 0.25}
        \draw[qfdthin] (0, \qfdEvalSep) -- (4.35, \qfdEvalSep);
        \pgfmathsetmacro{\qfdLegA}{\qfdEvalTop - 0.55}
        \draw[qfdalt1ln] (0.05, \qfdLegA) -- (0.45, \qfdLegA); \node[qfdalt1mk] at (0.25, \qfdLegA) {}; \node[anchor=west, font=\bfseries] at (0.55, \qfdLegA) {\qfdAltOneLabel};
        \pgfmathsetmacro{\qfdLegB}{\qfdEvalTop - 0.95}
        \draw[qfdalt2ln] (0.05, \qfdLegB) -- (0.45, \qfdLegB); \node[qfdalt2mk] at (0.25, \qfdLegB) {}; \node[anchor=west] at (0.55, \qfdLegB) {\qfdAltTwoLabel};
        \pgfmathsetmacro{\qfdLegC}{\qfdEvalTop - 1.35}
        \draw[qfdalt3ln] (0.05, \qfdLegC) -- (0.45, \qfdLegC); \node[qfdalt3mk] at (0.25, \qfdLegC) {}; \node[anchor=west] at (0.55, \qfdLegC) {\qfdAltThreeLabel};
      \fi \fi
    \end{scope}
  \fi
}

\newenvironment{qfdhouse}{%
  \begin{tikzpicture}[x=1cm, y=1cm, font=\scriptsize, line cap=round, line join=round]
  \ifqfdshowimportance
    \pgfmathsetmacro{\qfdLeftEdge}{-\qfdWhatW-\qfdImpW}
  \else
    \pgfmathsetmacro{\qfdLeftEdge}{-\qfdWhatW}
  \fi
  \pgfmathsetmacro{\qfdApexY}{\qfdHdrH + \qfdNH/2}
  \pgfmathtruncatemacro{\qfdNHm}{\qfdNH - 1}
  \pgfmathtruncatemacro{\qfdNWm}{\qfdNW - 1}
  \qfdDrawGrid
  \qfdDrawRoof
  \qfdDrawScale
  \qfdDrawZoneTitles
  \qfdDrawTitle
}{%
  \qfdDrawFrames
  \qfdDrawLegend
  \end{tikzpicture}%
}

\begin{document}

\def\qfdNW{3}
\def\qfdNH{8}
\def\qfdWhatW{4.5}
\def\qfdHdrH{3.6}
\def\qfdImpTitle{Wt}
\def\qfdWhatsTitle{Goals}
\def\qfdProjectTitle{Remanso}
\def\qfdConcept{A \textbf{beautiful}, read-only notes web for \textbf{pride} and \textbf{peace}, with one-gesture \textbf{public} publishing.}
\qfdshowcompetitivefalse

\begin{qfdhouse}
  \pgfmathsetmacro{\qfdWhatTextW}{\qfdWhatW - 0.2}
  \foreach \r/\t in {1/{G1 Beauty}, 2/{G2 Pride \& Peace (graceful on mobile)}, 3/{G3 Effortless public voice}}
    \node[anchor=west, font=\scriptsize, text width=\qfdWhatTextW cm, align=left] at ({\qfdLeftEdge + 0.1}, {-\r + 0.5}) {\t};
  \foreach \r/\imp in {1/9, 2/10, 3/8}
    \node[font=\scriptsize] at ({-\qfdImpW/2}, {-\r + 0.5}) {\imp};

  \foreach \c/\t in {1/{F1 Render fidelity}, 2/{F2 Typography}, 3/{F3 No broken refs}, 4/{F4 Snapshot integrity}, 5/{F5 Offline-resilient}, 6/{F6 Calm surface}, 7/{F7 Reveal web}, 8/{F8 1-gesture publish}}
    \node[rotate=90, anchor=west, font=\scriptsize] at ({\c - 0.5}, 0.15) {\t};

  % Relations — G1 (row 1)
  \node[qfdrel/S] at ({1-0.5},{-1+0.5}){}; \node[qfdrel/S] at ({2-0.5},{-1+0.5}){};
  \node[qfdrel/M] at ({3-0.5},{-1+0.5}){}; \node[qfdrel/W] at ({4-0.5},{-1+0.5}){};
  \node[qfdrel/W] at ({5-0.5},{-1+0.5}){}; \node[qfdrel/M] at ({6-0.5},{-1+0.5}){};
  \node[qfdrel/W] at ({7-0.5},{-1+0.5}){}; \node[qfdrel/W] at ({8-0.5},{-1+0.5}){};
  % G2 (row 2)
  \node[qfdrel/M] at ({1-0.5},{-2+0.5}){}; \node[qfdrel/M] at ({2-0.5},{-2+0.5}){};
  \node[qfdrel/S] at ({3-0.5},{-2+0.5}){}; \node[qfdrel/S] at ({4-0.5},{-2+0.5}){};
  \node[qfdrel/S] at ({5-0.5},{-2+0.5}){}; \node[qfdrel/S] at ({6-0.5},{-2+0.5}){};
  \node[qfdrel/S] at ({7-0.5},{-2+0.5}){}; \node[qfdrel/M] at ({8-0.5},{-2+0.5}){};
  % G3 (row 3)
  \node[qfdrel/M] at ({1-0.5},{-3+0.5}){}; \node[qfdrel/M] at ({2-0.5},{-3+0.5}){};
  \node[qfdrel/W] at ({3-0.5},{-3+0.5}){}; \node[qfdrel/W] at ({4-0.5},{-3+0.5}){};
  \node[qfdrel/W] at ({5-0.5},{-3+0.5}){}; \node[qfdrel/W] at ({6-0.5},{-3+0.5}){};
  \node[qfdrel/M] at ({7-0.5},{-3+0.5}){}; \node[qfdrel/S] at ({8-0.5},{-3+0.5}){};

  % Roof correlations
  \node[font=\scriptsize] at (C-1-2) {$+$};
  \node[font=\scriptsize] at (C-1-5) {$-\!-$};
  \node[font=\scriptsize] at (C-3-4) {$-$};
  \node[font=\scriptsize] at (C-3-5) {$+\!+$};
  \node[font=\scriptsize] at (C-2-6) {$-$};
  \node[font=\scriptsize] at (C-6-7) {$-$};
  \node[font=\scriptsize] at (C-2-8) {$+$};

  % Basement: target / difficulty / abs / rel
  \foreach \c/\tgt/\diff/\abs/\rel in {1/{all}/3/135/14, 2/{taste}/2/135/14, 3/{0 brk}/3/125/13, 4/{100\%}/3/107/11, 5/{offln}/4/107/11, 6/{calm}/2/125/13, 7/{on-dmd}/2/123/13, 8/{1-gest}/3/111/12} {
    \node[font=\scriptsize] at ({\c - 0.5}, {-\qfdNW - 0.5}) {\tgt};
    \node[font=\scriptsize] at ({\c - 0.5}, {-\qfdNW - 1.5}) {\diff};
    \node[font=\scriptsize] at ({\c - 0.5}, {-\qfdNW - 2.5}) {\abs};
    \node[font=\scriptsize\bfseries] at ({\c - 0.5}, {-\qfdNW - 3.5}) {\rel};
  }
\end{qfdhouse}
\end{document}
```

Basement rows per function: **target / difficulty (1–5) / absolute weight / relative weight %**.

---

## 1. Goals — the WHATs

| ID  | Goal                                                                                                                                                          | Weight | Source                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: | ---------------------------- |
| G1  | **Beauty** — notes render gorgeously; the page is something you want to look at                                                                               |   9    | Author intent (this session) |
| G2  | **Pride & Peace** — calm, trustworthy, quietly proud: nothing breaks, nothing misleads, nothing clutters; reads gracefully on a flaky mobile/metro connection |   10   | Author intent (this session) |
| G3  | **Effortless public voice** — lower _every_ wall to making your voice public: one gesture (`.pub.md`), open decentralized rails, no forms                     |   8    | Author intent (this session) |

## 2. Functions — the HOWs

| ID  | Function                                                                                                                                    | Dir | Target (now)                                                                                | Target (future)                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | :-: | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| F1  | **Render rich content faithfully** (math, code, diagrams, images, alerts, checkboxes) — for repo Notes _and_ Published Notes                |  ↑  | every supported type renders correctly; failures degrade gracefully (never raw error dumps) | —                                                          |
| F2  | **Present beautiful typography & layout** (fonts, width, prose, theme, lightbox); Published Notes carry their own theme/fonts/language      |  ↑  | tasteful defaults + per-repo/per-note tuning                                                | —                                                          |
| F3  | **Never show a broken live reference** (backlinks/images/notes resolve to current, or degrade gracefully)                                   |  ↓  | 0 visible broken refs in normal use; graceful placeholder on flaky network                  | 0 incl. edge cases                                         |
| F4  | **Preserve Snapshot references immutably** (a shared SHA link renders the exact shared version; never silently substitutes current content) |  →  | 100% snapshot fidelity; on uncached miss, latest-cached + disclosure banner                 | —                                                          |
| F5  | **Serve instantly, offline & resilient on mobile/flaky networks** (PouchDB cache-first; no spinner anxiety in the metro)                    |  ↓  | full offline read; cached render fast                                                       | cached render ≤ ~100 ms; survives mid-read connection loss |
| F6  | **Keep the surface calm & uncluttered** (reading-first, settings tucked away, the Remanso stillness)                                        |  →  | minimal chrome; no nags/noise                                                               | —                                                          |
| F7  | **Reveal the web of connections** (backlinks + stacked notes) — _calm by default, on demand_                                                |  ↑  | every Note shows inbound links; stacking fluid; nothing flooded                             | —                                                          |
| F8  | **Publish in one gesture to open rails** (`.pub.md` → ATProto Published Note; no in-app form; decentralized, author-owned)                  |  ↓  | publish = rename + push (1 gesture), 0 in-app steps                                         | —                                                          |

## 3. Cascade — Goals → Functions → How → Components

- **G1 Beauty** _W:9_
  - **F1** Render rich content faithfully _Dir↑_
    - **How**: markdown-it pipeline with plugins; each renderer wrapped so a parse failure yields a styled fallback, not a stack trace
      - **Component**: C1 `useMarkdown` + plugins (KaTeX, Shikiji, Mermaid, TikZ, GitHub alerts, checkboxes)
  - **F2** Beautiful typography & layout _Dir↑_
    - **How**: DaisyUI theme + `@tailwindcss/typography` prose + per-repo `UserSettings`; Published Notes apply their stored theme/fonts
      - **Component**: C2 Theme & typography system (themes, fonts/width, image lightbox)
- **G2 Pride & Peace** _W:10_
  - **F3** Never show a broken live reference _Dir↓ Target 0 broken_
    - **How**: a single bidirectional Path↔SHA index; resolve Live references by Path; fix the in-stack edit bug; graceful placeholder when a target is genuinely missing
      - **Component**: C3 Reference resolver (Path↔SHA index over `store.files`)
  - **F4** Preserve Snapshot references immutably _Dir→_ — see [ADR-0002](docs/adr/0002-two-reference-modes.md)
    - **How**: keep SHA-addressed stack URLs; render the pinned version; on cache miss show honest "unavailable", never substitute current
      - **Component**: C4 Snapshot pinning + unavailable state
  - **F5** Serve instantly, offline & resilient _Dir↓ Target offline read_
    - **How**: cache-first reads from PouchDB via the worker; render from cache before/without network; tolerate mid-read connection loss
      - **Component**: C5 PouchDB cache + `DataApi` worker; C9 Freshness/pull
  - **F6** Keep the surface calm & uncluttered _Dir→_
    - **How**: reading-first Igarapé; settings/chrome tucked away; no nags
      - **Component**: C6 Igarapé surface + calm chrome
  - **F7** Reveal the web of connections — calm by default _Dir↑_
    - **How**: backlinks present but quiet; a Note opens into the stack only when its Backlink is summoned (progressive disclosure)
      - **Component**: C7 Backlinks + Stacked Notes (reveal-on-demand)
- **G3 Effortless public voice** _W:8_
  - **F8** Publish in one gesture to open rails _Dir↓ friction_
    - **How**: `.pub.md` suffix → external/CI publish to ATProto as a Published Note; in-app surfaces read those records, styled like private notes
      - **Component**: C8 Publish pipeline + ATProto read plumbing (`getUrl`, `withATProtoImages`, `Public*`→`Published*` views)

## 4. House — Goals × Functions

Cells: link strength (9/3/1/blank). Importance row = Σ(weight × strength).

|                       | F1  | F2  | F3  | F4  | F5  | F6  | F7  | F8  |
| --------------------- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| G1 Beauty (9)         |  9  |  9  |  3  |  1  |  1  |  3  |  1  |  1  |
| G2 Pride & Peace (10) |  3  |  3  |  9  |  9  |  9  |  9  |  9  |  3  |
| G3 Public voice (8)   |  3  |  3  |  1  |  1  |  1  |  1  |  3  |  9  |
| **Σ**                 | 135 | 135 | 125 | 107 | 107 | 125 | 123 | 111 |

**Top engineering priorities:** F1/F2 (rendering beauty) lead on raw Σ because all three goals touch them; F3 and F6 follow on the strength of Pride & Peace. **Caveat the matrix hides:** the _primary read context is mobile on a flaky metro connection_, which makes F3 (graceful) + F5 (offline-resilient) the **reliability spine to watch hardest** — a broken note in the metro is far more peace-destroying than its mid-pack Σ suggests. Treat F3+F5 as critical despite F5's rank (see §7).

## 5. Roof — Function × Function tradeoffs

`◎` strong reinforce · `○` mild reinforce · `×` mild conflict · `⊗` strong conflict.

|        | F1  | F2  | F3  | F4  | F5  | F6  | F7  | F8  |
| ------ | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| **F1** |  —  |  ○  |     |     |  ⊗  |     |     |     |
| **F2** |     |  —  |     |     |     |  ×  |     |  ○  |
| **F3** |     |     |  —  |  ×  |  ◎  |     |     |     |
| **F4** |     |     |     |  —  |     |     |     |     |
| **F5** |     |     |     |     |  —  |     |     |     |
| **F6** |     |     |     |     |     |  —  |  ×  |     |
| **F7** |     |     |     |     |     |     |  —  |     |
| **F8** |     |     |     |     |     |     |     |  —  |

**Conflicts that actually shape the design:**

- **F1 ⊗ F5** (rich rendering vs instant/offline-on-mobile) — heavy renderers fight load speed and battery. Mitigation: lazy-load renderers, cache rendered HTML, render-from-cache first (T2).
- **F3 × F4** (never-broken vs immutable snapshot) — resolved by [ADR-0002](docs/adr/0002-two-reference-modes.md): pre-cache aggressively; on a true miss, show latest-cached + a disclosure banner — integrity via _disclosure, not refusal_, so the metro never dead-ends (T3).
- **F6 × F7** (calm vs the web) — resolved: **calm by default, reveal on demand** (T1).
- **F3 ◎ F5** (graceful refs reinforce offline resilience) — cache-first resolution makes both true at once; design them together.
- **F2 × F6** (customization vs clutter) — keep settings tucked away, defaults tasteful.

## 6. Components & Function → Component map

| ID  | Component                                                  | ADR      |
| --- | ---------------------------------------------------------- | -------- |
| C1  | `useMarkdown` + markdown-it plugins (math/code/diagrams/…) | —        |
| C2  | Theme & typography system (themes, fonts/width, lightbox)  | —        |
| C3  | Reference resolver — Path↔SHA index over `store.files`     | ADR-0001 |
| C4  | Snapshot pinning + "unavailable" state                     | ADR-0002 |
| C5  | PouchDB cache + `DataApi` worker (cache-first reads)       | —        |
| C6  | Igarapé reading surface + calm chrome                      | —        |
| C7  | Backlinks + Stacked Notes (reveal-on-demand)               | —        |
| C8  | Publish pipeline + ATProto read plumbing                   | —        |
| C9  | Freshness / pull (external-commit detection)               | ADR-0001 |

|     | C1  | C2  | C3  | C4  | C5  | C6  | C7  | C8  | C9  |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| F1  |  9  |  3  |     |     |  3  |     |     |  1  |     |
| F2  |  1  |  9  |     |     |     |  3  |     |  1  |     |
| F3  |     |     |  9  |  1  |  3  |     |  3  |     |  9  |
| F4  |     |     |  1  |  9  |  3  |     |     |     |     |
| F5  |     |     |  3  |  3  |  9  |     |     |     |  3  |
| F6  |     |  3  |     |     |     |  9  |  3  |     |     |
| F7  |     |     |  3  |     |     |  3  |  9  |     |     |
| F8  |     |  1  |     |     |     |     |     |  9  |     |

## 7. Critical performance budget

| Rank | Function                | Target                                              | Watched on                                                                                     | If we miss it                                                                                                   |
| ---- | ----------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1    | F3 (never broken)       | 0 visible broken live refs                          | manual mobile run + a "broken-ref" dev assertion; fix the StackedNote `saveCacheNote` path bug | render a calm placeholder ("note unavailable"), never a stack trace or empty column                             |
| 2    | F5 (offline/mobile)     | full offline read; survive mid-read connection loss | DevTools offline/slow-3G throttling on the stacked-notes flow                                  | cache-first always; if uncached + offline, honest "not downloaded yet" placeholder                              |
| 3    | F1 (render fidelity)    | all content types render; failures degrade          | snapshot-render a fixture note (math/code/mermaid/tikz/alerts)                                 | per-block styled fallback; the rest of the note still renders                                                   |
| 4    | F4 (snapshot integrity) | 100% pinned-version fidelity                        | test: edit a Note, re-open an old `?stackedNotes=sha` link                                     | show pinned version; on a true miss, latest-cached + disclosure banner — never _silent_ substitution (ADR-0002) |
| 5    | F8 (publish friction)   | 1 gesture, 0 in-app steps                           | end-to-end: `.pub.md` push → appears in `/notes`                                               | surface the failure plainly; do not require an in-app fallback form (would re-raise the wall)                   |

## 8. Tradeoffs — Got / Paid / ADR

| ID  | Tradeoff                                                                | Got                                                                 | Paid                                                                 | ADR                                              |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------ |
| T1  | Calm-by-default over web-forward (F6 > F7 prominence)                   | Stillness; the Remanso peace                                        | Connections less immediately visible (mitigated by reveal-on-demand) | —                                                |
| T2  | Lazy-load + cache rendered HTML (F1 ⊗ F5)                               | Fidelity _and_ instant/offline render                               | Cache complexity; possible stale-render window                       | —                                                |
| T3  | Integrity via disclosure, not refusal (F3 + F4 in the unavailable edge) | No silent rewrite _and_ no metro dead-end: latest-cached + a banner | A banner caveat instead of a guaranteed exact view when uncached     | [ADR-0002](docs/adr/0002-two-reference-modes.md) |
| T4  | Filename-suffix publishing (`.pub.md`) over in-app publish UI (F8)      | Near-zero friction; publishing is a gesture, not a feature          | Less in-app preview/control; coupling to a naming convention         | —                                                |

### Tensions being watched (unresolved by design)

- **Rename/move changes a Note's Path → its Live references break.** Under ADR-0001 that's a new identity; we accept it for now. **Trigger to revisit:** if reorganizing notes becomes common enough that broken backlinks hurt Peace, add git-rename following.
- **F1 ⊗ F5 residual cost on low-end mobile.** Even lazy + cached, very heavy notes (large TikZ/Mermaid) may stutter in the metro. **Trigger to revisit:** if real mobile runs show jank, pre-render heavy blocks to images at publish/cache time.

## 9. Inconsistencies spotted and fixed

- **In-stack edit bug:** `StackedNote.performSave()` called `saveCacheNote()` without `path`, so `store.files` never got the new SHA after an in-Igarapé edit (`FleetingNotes` passed it correctly). Broke F3. **Fixed** — `StackedNote.vue` now passes `path`.
- **Asymmetric file index:** `addFile` deduped by SHA only, `registerUploadedFile` by PATH — so an edit (same path, new SHA) left a stale duplicate entry. **Fixed** — `addFile` now dedups by SHA _and_ path (a path is unique), with a regression test in `userRepo.store.spec.ts`. (Full bidirectional index C3 still the longer-term direction.)
- **ADR-0001 over-absolute:** it called SHA-keyed references "a fragility". **Refined** by ADR-0002 into two intentional modes (Live/Snapshot).
- **`CLAUDE.md` "edit history tracking"** mislabels the visited-repos History; no edit-history feature exists. (Flagged in CONTEXT.md.)
- **Snapshot cache not immutable:** editing writes new content under the _viewed_ (old) SHA's cache key (`prepareNoteCache` keys by the viewed sha), so a re-opened old-SHA snapshot can serve new content from cache. **Decided fix (ADR-0002):** key the immutable store by the content's _own_ SHA (write-once), keep the Path key as the latest pointer. _(Not yet implemented — the C3/C4 cache slice; unlocks the snapshot banner.)_
- **Naming drift carried from the language session:** `Flux`→`Igarapé`, `HistoricNotes`→`Index`, `Repetition`→`Card`, `PublicNote*`→`PublishedNote*`, `useNotes()` returns Files not Notes. (Tracked in CONTEXT.md "Flagged ambiguities".)

---

## How to keep this honest

- When a new ADR lands → add its components to §6 and re-score affected rows.
- When a spike / measurement returns numbers → update §7 `Target` / `Watched on`.
- WHATs change rarely; HOWs change with each release; matrices are recomputed when either side changes.
- If a section becomes empty after edits, delete it — empty sections lie.

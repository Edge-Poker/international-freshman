/**
 * Cena de chegada: a vista da janela do aviao na aproximacao, ao amanhecer.
 *
 * Nao e client component de proposito. Depois que tiramos a interacao com o
 * cursor, sobrou animacao 100% em CSS: nenhum JavaScript, nenhuma hidratacao,
 * zero peso no bundle do navegador. O servidor renderiza uma vez e entrega.
 *
 * O CSS vive em app/globals.css, escopado por .arrival-scene. Fica la, e nao
 * num modulo, porque as classes sao usadas dentro de um SVG grande e inline;
 * escopar por elemento pai sai mais legivel do que anotar cada no.
 *
 * Origem: cena desenhada no Claude Design e portada. Duas correcoes minhas
 * na portagem estao registradas no git: o parallax original custava 2,8s de
 * recalculo de estilo a cada 5s (variavel CSS herdada invalidando ~740 nos
 * por frame), e o deslocamento era imperceptivel. Como a interacao acabou
 * removida a pedido, sobrou so a leveza.
 */
export function ArrivalScene() {
  return (
    <div className="arrival-scene card relative overflow-hidden p-0 shadow-card">
      <svg viewBox="0 0 500 400" role="img" aria-label="View from an airplane window at dawn, on approach over a lit city" style={{ display: "block", width: "100%", height: "100%" } as React.CSSProperties}>
            <defs>
              {/* céu: noite no topo -> azul da marca -> fio dourado no horizonte */}
              <linearGradient id="a-sky" gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="258">
                <stop offset="0" stopColor="#080B12"/>
                <stop offset=".5" stopColor="#090F1B"/>
                <stop offset=".74" stopColor="#0D1928"/>
                <stop offset=".88" stopColor="#14293F"/>
                <stop offset=".955" stopColor="#2478D4" stopOpacity=".55"/>
                <stop offset=".99" stopColor="#3B9EFF" stopOpacity=".5"/>
                <stop offset="1" stopColor="#E0A93B" stopOpacity=".42"/>
              </linearGradient>
              {/* clarão do amanhecer, deslocado para a direita */}
              <radialGradient id="a-dawn" gradientUnits="userSpaceOnUse" cx="330" cy="259" r="165">
                <stop offset="0" stopColor="#E0A93B" stopOpacity=".26"/>
                <stop offset=".3" stopColor="#3B9EFF" stopOpacity=".16"/>
                <stop offset="1" stopColor="#3B9EFF" stopOpacity="0"/>
              </radialGradient>
              <linearGradient id="a-ground" gradientUnits="userSpaceOnUse" x1="0" y1="258" x2="0" y2="362">
                <stop offset="0" stopColor="#0C121C"/>
                <stop offset=".35" stopColor="#070B12"/>
                <stop offset="1" stopColor="#05070C"/>
              </linearGradient>
              {/* neblina luminosa acima da cidade */}
              {/* faixa do amanhecer: dourado à direita, azul da marca à esquerda */}
              <linearGradient id="a-dawnband" gradientUnits="userSpaceOnUse" x1="60" y1="0" x2="470" y2="0">
                <stop offset="0" stopColor="#2478D4" stopOpacity=".16"/>
                <stop offset=".5" stopColor="#3B9EFF" stopOpacity=".3"/>
                <stop offset=".8" stopColor="#E0A93B" stopOpacity=".38"/>
                <stop offset="1" stopColor="#E0A93B" stopOpacity=".18"/>
              </linearGradient>
              <linearGradient id="a-haze" gradientUnits="userSpaceOnUse" x1="0" y1="252" x2="0" y2="296">
                <stop offset="0" stopColor="#3B9EFF" stopOpacity=".15"/>
                <stop offset="1" stopColor="#3B9EFF" stopOpacity="0"/>
              </linearGradient>

              {/* nuvens: iluminação vertical por camada */}
              <linearGradient id="a-cf" gradientUnits="userSpaceOnUse" x1="0" y1="224" x2="0" y2="198">
                <stop offset="0" stopColor="#2478D4" stopOpacity=".22"/>
                <stop offset=".45" stopColor="#101C2E" stopOpacity=".45"/>
                <stop offset="1" stopColor="#080B12" stopOpacity=".58"/>
              </linearGradient>
              <linearGradient id="a-cm" gradientUnits="userSpaceOnUse" x1="0" y1="260" x2="0" y2="292">
                <stop offset="0" stopColor="#3B9EFF" stopOpacity=".2"/>
                <stop offset=".35" stopColor="#0B1220" stopOpacity=".55"/>
                <stop offset="1" stopColor="#05070C" stopOpacity=".72"/>
              </linearGradient>
              <linearGradient id="a-cn" gradientUnits="userSpaceOnUse" x1="0" y1="322" x2="0" y2="380">
                <stop offset="0" stopColor="#3B9EFF" stopOpacity=".26"/>
                <stop offset=".4" stopColor="#141924" stopOpacity=".7"/>
                <stop offset="1" stopColor="#05070C" stopOpacity=".92"/>
              </linearGradient>
              <filter id="a-b1" x="-8%" y="-320%" width="116%" height="740%"><feGaussianBlur stdDeviation="3.4"/></filter>
              <filter id="a-b2" x="-8%" y="-220%" width="116%" height="540%"><feGaussianBlur stdDeviation="5.5"/></filter>
              <filter id="a-b3" x="-8%" y="-160%" width="116%" height="420%"><feGaussianBlur stdDeviation="8"/></filter>
              <filter id="a-soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.6"/></filter>

              {/* tile de quarteirões: ruas + janelas acesas */}
              <g id="a-tile">
                <rect x="0" y="12" width="40" height=".7" fill="#3B9EFF" opacity=".16"/>
                <rect x="19" y="0" width=".7" height="26" fill="#3B9EFF" opacity=".12"/>
                <circle cx="4" cy="4" r="1.15" fill="#3B9EFF" opacity=".95"/>
                <circle cx="13" cy="8" r=".85" fill="#F2F5F9" opacity=".75"/>
                <circle cx="27" cy="3" r="1" fill="#3B9EFF" opacity=".8"/>
                <circle cx="35" cy="14" r=".8" fill="#E0A93B" opacity=".62"/>
                <circle cx="8" cy="18" r=".95" fill="#3B9EFF" opacity=".65"/>
                <circle cx="23" cy="21" r=".8" fill="#F2F5F9" opacity=".5"/>
                <circle cx="32" cy="23" r=".7" fill="#3B9EFF" opacity=".55"/>
              </g>
              <pattern id="a-cityFar" width="40" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(-7) scale(.42)"><use href="#a-tile"/></pattern>
              <pattern id="a-cityNear" width="40" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(-7) scale(.95)"><use href="#a-tile"/></pattern>
              <radialGradient id="a-pool"><stop offset="0" stopColor="#3B9EFF" stopOpacity=".3"/><stop offset="1" stopColor="#3B9EFF" stopOpacity="0"/></radialGradient>
              <radialGradient id="a-poolg"><stop offset="0" stopColor="#E0A93B" stopOpacity=".26"/><stop offset="1" stopColor="#E0A93B" stopOpacity="0"/></radialGradient>
              <linearGradient id="a-mgf" gradientUnits="userSpaceOnUse" x1="0" y1="257" x2="0" y2="304">
                <stop offset="0" stopColor="#fff" stopOpacity="0"/>
                <stop offset=".16" stopColor="#fff" stopOpacity=".95"/>
                <stop offset="1" stopColor="#fff" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="a-mgn" gradientUnits="userSpaceOnUse" x1="0" y1="262" x2="0" y2="342">
                <stop offset="0" stopColor="#fff" stopOpacity=".2"/>
                <stop offset=".28" stopColor="#fff" stopOpacity="1"/>
                <stop offset="1" stopColor="#fff" stopOpacity="0"/>
              </linearGradient>
              <mask id="a-mk1" maskUnits="userSpaceOnUse" x="40" y="254" width="440" height="56"><rect x="40" y="254" width="440" height="56" fill="url(#a-mgf)"/></mask>
              <mask id="a-mk2" maskUnits="userSpaceOnUse" x="40" y="260" width="440" height="86"><rect x="40" y="260" width="440" height="86" fill="url(#a-mgn)"/></mask>

              {/* parede da cabine: recorte da janela */}
              <mask id="a-wall" maskUnits="userSpaceOnUse" x="-60" y="-60" width="620" height="520">
                <rect x="-60" y="-60" width="620" height="520" fill="#fff"/>
                <rect x="104" y="22" width="292" height="328" rx="118" fill="#000"/>
              </mask>
              <linearGradient id="a-wallg" gradientUnits="userSpaceOnUse" x1="30" y1="0" x2="470" y2="400">
                <stop offset="0" stopColor="#141924"/>
                <stop offset=".55" stopColor="#10151F"/>
                <stop offset="1" stopColor="#0B0F17"/>
              </linearGradient>
              {/* luz da janela derramando na parede */}
              <radialGradient id="a-spill" gradientUnits="userSpaceOnUse" cx="250" cy="230" r="240">
                <stop offset="0" stopColor="#3B9EFF" stopOpacity=".12"/>
                <stop offset="1" stopColor="#3B9EFF" stopOpacity="0"/>
              </radialGradient>
              {/* reflexo no vidro */}
              <linearGradient id="a-glass" gradientUnits="userSpaceOnUse" x1="120" y1="30" x2="340" y2="300">
                <stop offset="0" stopColor="#F2F5F9" stopOpacity=".08"/>
                <stop offset=".42" stopColor="#F2F5F9" stopOpacity="0"/>
              </linearGradient>
              {/* luz do horizonte no aro inferior do vidro */}
              <linearGradient id="a-rim" gradientUnits="userSpaceOnUse" x1="0" y1="120" x2="0" y2="350">
                <stop offset="0" stopColor="#3B9EFF" stopOpacity="0"/>
                <stop offset="1" stopColor="#3B9EFF" stopOpacity=".55"/>
              </linearGradient>
              <radialGradient id="a-vig" cx=".5" cy=".5" r=".74">
                <stop offset=".58" stopColor="#080B12" stopOpacity="0"/>
                <stop offset="1" stopColor="#080B12" stopOpacity=".6"/>
              </radialGradient>
              <clipPath id="a-win"><rect x="104" y="22" width="292" height="328" rx="118"/></clipPath>

              {/* tiles de nuvem (repetidos por <use> para o loop) */}
              <g id="a-clA">
                <ellipse cx="20" cy="220" rx="110" ry="3.2"/><ellipse cx="90" cy="217" rx="90" ry="2.6"/>
                <ellipse cx="150" cy="222" rx="120" ry="3.4"/><ellipse cx="225" cy="215" rx="95" ry="2.4"/>
                <ellipse cx="300" cy="221" rx="110" ry="3"/><ellipse cx="120" cy="207" rx="70" ry="1.8"/>
                <ellipse cx="258" cy="203" rx="55" ry="1.4"/><ellipse cx="340" cy="209" rx="62" ry="1.7"/>
              </g>
              <g id="a-clB">
                <ellipse cx="30" cy="272" rx="140" ry="5.5"/><ellipse cx="140" cy="267" rx="110" ry="4"/>
                <ellipse cx="250" cy="275" rx="150" ry="6"/><ellipse cx="350" cy="266" rx="100" ry="3.6"/>
                <ellipse cx="450" cy="273" rx="140" ry="5"/><ellipse cx="200" cy="281" rx="120" ry="4.4"/>
                <ellipse cx="520" cy="264" rx="90" ry="3"/>
              </g>
              <g id="a-clC">
                <ellipse cx="70" cy="356" rx="150" ry="22"/><ellipse cx="220" cy="340" rx="110" ry="13"/>
                <ellipse cx="330" cy="362" rx="170" ry="24"/><ellipse cx="470" cy="344" rx="96" ry="12"/>
                <ellipse cx="600" cy="358" rx="140" ry="20"/><ellipse cx="410" cy="330" rx="70" ry="7"/>
                <ellipse cx="700" cy="346" rx="90" ry="11"/>
              </g>
            </defs>

            {/* ================= A VISTA (recortada pela janela) ================= */}
            <g clipPath="url(#a-win)">
              <rect x="-60" y="-60" width="620" height="460" fill="url(#a-sky)"/>
              <rect x="-60" y="242" width="620" height="16" fill="url(#a-dawnband)" filter="url(#a-b1)"/>
              <ellipse cx="338" cy="258" rx="130" ry="9" fill="#E0A93B" opacity=".12" filter="url(#a-soft)"/>

              {/* céu + estrelas (mais distante, quase parado) */}
              <g>
                <rect x="-60" y="-60" width="620" height="460" fill="url(#a-dawn)"/>
                <g fill="#F2F5F9">
                  <circle className="star" cx="130" cy="62" r=".9" style={{ "--o": ".7", animationDuration: "6s", animationDelay: "-1s" } as React.CSSProperties}/>
                  <circle className="star" cx="162" cy="44" r=".7" style={{ "--o": ".5", animationDuration: "4s", animationDelay: "-2.5s" } as React.CSSProperties}/>
                  <circle className="star" cx="198" cy="82" r=".8" style={{ "--o": ".6", animationDuration: "3s", animationDelay: "-.5s" } as React.CSSProperties}/>
                  <circle className="star" cx="228" cy="52" r=".6" style={{ "--o": ".45", animationDuration: "6s", animationDelay: "-3s" } as React.CSSProperties}/>
                  <circle className="star" cx="264" cy="38" r="1" style={{ "--o": ".8", animationDuration: "4s", animationDelay: "-1.5s" } as React.CSSProperties}/>
                  <circle className="star" cx="294" cy="72" r=".7" style={{ "--o": ".55", animationDuration: "6s", animationDelay: "-4s" } as React.CSSProperties}/>
                  <circle className="star" cx="320" cy="48" r=".8" style={{ "--o": ".6", animationDuration: "3s", animationDelay: "-2s" } as React.CSSProperties}/>
                  <circle className="star" cx="352" cy="66" r=".6" style={{ "--o": ".4", animationDuration: "4s", animationDelay: "-.8s" } as React.CSSProperties}/>
                  <circle className="star" cx="372" cy="40" r=".9" style={{ "--o": ".65", animationDuration: "6s", animationDelay: "-5s" } as React.CSSProperties}/>
                  <circle className="star" cx="142" cy="104" r=".7" style={{ "--o": ".45", animationDuration: "4s", animationDelay: "-3.2s" } as React.CSSProperties}/>
                  <circle className="star" cx="212" cy="114" r=".6" style={{ "--o": ".35", animationDuration: "6s", animationDelay: "-2.2s" } as React.CSSProperties}/>
                  <circle className="star" cx="302" cy="106" r=".7" style={{ "--o": ".4", animationDuration: "3s", animationDelay: "-1.2s" } as React.CSSProperties}/>
                  <circle className="star" cx="356" cy="96" r=".6" style={{ "--o": ".3", animationDuration: "4s", animationDelay: "-2.8s" } as React.CSSProperties}/>
                  <circle className="star" cx="250" cy="88" r=".7" style={{ "--o": ".45", animationDuration: "6s", animationDelay: "-.4s" } as React.CSSProperties}/>
                </g>
              </g>

              {/* solo: cidade em duas escalas (perspectiva), rodovia, pista */}
              <g>
                <g className="cdrift">
                  <rect x="40" y="258" width="440" height="108" fill="url(#a-ground)"/>
                  <g mask="url(#a-mk1)"><rect x="40" y="254" width="440" height="56" fill="url(#a-cityFar)"/></g>
                  <g mask="url(#a-mk2)"><rect x="40" y="260" width="440" height="86" fill="url(#a-cityNear)"/></g>
                  {/* poças de luz: bairros densos */}
                  <ellipse cx="300" cy="290" rx="78" ry="20" fill="url(#a-pool)"/>
                  <ellipse cx="200" cy="310" rx="64" ry="18" fill="url(#a-pool)"/>
                  <ellipse cx="366" cy="274" rx="52" ry="11" fill="url(#a-poolg)"/>
                  {/* rodovia curvando até o horizonte */}
                  <path d="M118 344 Q210 316 272 288 T356 264" fill="none" stroke="#E0A93B" strokeOpacity=".1" strokeWidth="2.6" strokeLinecap="round" filter="url(#a-soft)"/>
                </g>
                {/* bloom das luzes (fora da deriva: filtro estático, sem custo por frame) */}
                <g mask="url(#a-mk2)" filter="url(#a-soft)" opacity=".85"><rect x="40" y="260" width="440" height="86" fill="url(#a-cityNear)"/></g>
                {/* núcleo do centro: luzes mais fortes com pulso lento */}
                <g>
                  <circle className="blink" cx="286" cy="300" r="1.2" fill="#F2F5F9" style={{ animationDelay: "-1s" } as React.CSSProperties}/>
                  <circle className="blink" cx="300" cy="292" r="1.1" fill="#3B9EFF" style={{ animationDelay: "-3s" } as React.CSSProperties}/>
                  <circle className="blink" cx="310" cy="286" r="1" fill="#F2F5F9" style={{ animationDelay: "-2s" } as React.CSSProperties}/>
                  <circle className="blink" cx="320" cy="296" r="1.2" fill="#3B9EFF" style={{ animationDelay: "-4.5s" } as React.CSSProperties}/>
                  <circle className="blink" cx="332" cy="288" r="1" fill="#E0A93B" style={{ animationDelay: "-.5s" } as React.CSSProperties}/>
                  <circle className="blink" cx="228" cy="306" r="1.1" fill="#3B9EFF" style={{ animationDelay: "-2.6s" } as React.CSSProperties}/>
                  <circle className="blink" cx="196" cy="296" r="1" fill="#F2F5F9" style={{ animationDelay: "-5s" } as React.CSSProperties}/>
                  <circle className="blink" cx="258" cy="316" r="1.2" fill="#3B9EFF" style={{ animationDelay: "-3.8s" } as React.CSSProperties}/>
                  <circle className="blink" cx="356" cy="302" r="1" fill="#F2F5F9" style={{ animationDelay: "-1.6s" } as React.CSSProperties}/>
                </g>
                {/* neblina do horizonte por cima da cidade */}
                <rect x="40" y="252" width="440" height="44" fill="url(#a-haze)"/>
                <ellipse className="bloom" cx="318" cy="258" rx="120" ry="7" fill="#3B9EFF" filter="url(#a-soft)"/>
                {/* pista de pouso + luzes de aproximação sequenciais */}
                <g>
                  <rect x="342" y="252" width="15" height="1.2" fill="#E0A93B" opacity=".45"/>
                  <circle className="flash" cx="300" cy="258" r=".9" fill="#E0A93B" style={{ animationDelay: "0s" } as React.CSSProperties}/>
                  <circle className="flash" cx="310" cy="257" r=".9" fill="#E0A93B" style={{ animationDelay: ".12s" } as React.CSSProperties}/>
                  <circle className="flash" cx="320" cy="256" r=".9" fill="#E0A93B" style={{ animationDelay: ".24s" } as React.CSSProperties}/>
                  <circle className="flash" cx="330" cy="255" r=".9" fill="#E0A93B" style={{ animationDelay: ".36s" } as React.CSSProperties}/>
                  <circle className="flash" cx="340" cy="254" r="1" fill="#E0A93B" style={{ animationDelay: ".48s" } as React.CSSProperties}/>
                </g>
              </g>

              {/* nuvens finas acima do horizonte (tile 360) */}
              <g>
                <g className="drift" style={{ "--tile": "360px" } as React.CSSProperties} fill="url(#a-cf)" filter="url(#a-b1)">
                  <use href="#a-clA" x="-360"/><use href="#a-clA"/><use href="#a-clA" x="360"/><use href="#a-clA" x="720"/>
                </g>
              </g>

              {/* nuvens abaixo do avião, sobre a cidade (tile 540) */}
              <g>
                <g className="drift" style={{ "--tile": "540px" } as React.CSSProperties} fill="url(#a-cm)" filter="url(#a-b2)">
                  <use href="#a-clB" x="-540"/><use href="#a-clB"/><use href="#a-clB" x="540"/><use href="#a-clB" x="1080"/>
                </g>
              </g>

              {/* nuvens próximas passando por baixo (tile 780) */}
              <g>
                <g className="drift" style={{ "--tile": "780px" } as React.CSSProperties} fill="url(#a-cn)" filter="url(#a-b3)">
                  <use href="#a-clC" x="-780"/><use href="#a-clC"/><use href="#a-clC" x="780"/>
                </g>
              </g>

              {/* asa: objeto mais próximo fora do vidro */}
              <g className="wing">
                <polygon points="222,352 316,330 388,300 398,313 350,352" fill="#0B1220" opacity=".97"/>
                <path d="M222 352 L316 330 L388 300" fill="none" stroke="#3B9EFF" strokeOpacity=".6" strokeWidth="1.2"/>
                <path d="M350 352 L398 313" fill="none" stroke="#3B9EFF" strokeOpacity=".22" strokeWidth=".8"/>
                <circle className="beacon" cx="390" cy="302" r="1.7" fill="#E0A93B"/>
                <circle className="beacon" cx="390" cy="302" r="4" fill="#E0A93B" opacity=".25" filter="url(#a-soft)"/>
              </g>

              {/* vidro: sombra do recesso + reflexo */}
              <rect x="104" y="22" width="292" height="328" rx="118" fill="none" stroke="#050810" strokeOpacity=".6" strokeWidth="15" filter="url(#a-b2)"/>
              <rect x="104" y="22" width="292" height="328" rx="118" fill="url(#a-glass)"/>
              <rect x="104" y="22" width="292" height="328" rx="118" fill="none" stroke="url(#a-rim)" strokeWidth="1.6"/>
            </g>

            {/* ================= MOLDURA / CABINE ================= */}
            <g>
              <rect x="-60" y="-60" width="620" height="520" fill="url(#a-wallg)" mask="url(#a-wall)"/>
              <rect x="-60" y="-60" width="620" height="520" fill="url(#a-spill)" mask="url(#a-wall)"/>
              <rect x="104" y="22" width="292" height="328" rx="118" fill="none" stroke="#F2F5F9" strokeOpacity=".08" strokeWidth="1.4"/>
              <rect x="95" y="13" width="310" height="346" rx="129" fill="none" stroke="#F2F5F9" strokeOpacity=".035" strokeWidth="1"/>
              <circle cx="250" cy="340" r="3.4" fill="#05070C" opacity=".9"/>
              <circle cx="250" cy="340" r="3.4" fill="none" stroke="#F2F5F9" strokeOpacity=".07" strokeWidth=".8"/>
            </g>

            <rect width="500" height="400" fill="url(#a-vig)"/>
          </svg>
      {/* rotulos sobre a parede da cabine */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-3 px-[5.5%] pb-[3.4%] font-mono text-[9px] uppercase tracking-[0.22em] text-dim sm:text-[10px]">
        <span>Arrival</span>
        <span>
          Final approach <span className="text-gold">05:41</span>
        </span>
      </div>
    </div>
  );
}

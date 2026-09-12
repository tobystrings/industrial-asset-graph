import type { GuideAnimation, GuidePreferences } from './guideTypes';

/** Original articulated vector character. Every moving part has a local transform origin. */
export function GuideCharacter({ animation = 'idle', mode }: { animation?: GuideAnimation; mode: GuidePreferences['animationMode'] }) {
  return <div className="genie-character" data-state={animation} data-motion={mode} aria-hidden="true">
    <svg viewBox="0 0 280 320" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse className="genie-shadow" cx="137" cy="289" rx="67" ry="12" fill="#050505" opacity=".7"/>
      <g className="genie-body">
        <path className="genie-tail" d="M107 219C83 251 194 239 174 260C164 272 117 257 123 276C128 289 151 279 155 288" stroke="#bdbdbd" strokeWidth="17" strokeLinecap="round"/>
        <path d="M156 282L171 283L172 296L157 297Z" fill="#e9e9e9" stroke="#131313" strokeWidth="3"/>
        <path d="M170 286H179M170 293H179" stroke="#e9e9e9" strokeWidth="4" strokeLinecap="round"/>
        <g className="genie-arm genie-arm-left">
          <path d="M95 170Q66 164 60 201" stroke="#c4c4c4" strokeWidth="21" strokeLinecap="round"/>
          <path d="M59 192C47 185 43 193 46 205L53 218Q67 226 74 212L72 195Z" fill="#f0f0f0" stroke="#202020" strokeWidth="3"/>
          <path d="M51 199L58 209M61 197L66 207" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
        </g>
        <path d="M94 157Q137 143 180 157L184 210Q162 238 106 220Z" fill="#333" stroke="#d2d2d2" strokeWidth="3"/>
        <path d="M105 155V186H169V155M109 185V218M166 185V219" stroke="#9b9b9b" strokeWidth="10"/>
        <circle cx="110" cy="177" r="4" fill="#f1f1f1"/><circle cx="164" cy="177" r="4" fill="#f1f1f1"/>
        <path d="M125 189H153V207Q139 218 125 207Z" fill="#202020" stroke="#b6b6b6" strokeWidth="2"/>
        <path d="M141 188L133 201H140L135 212L149 197H142L148 188Z" fill="#f3f3f3"/>
        <g className="genie-arm genie-arm-right">
          <path d="M180 170Q200 185 218 160" stroke="#c4c4c4" strokeWidth="21" strokeLinecap="round"/>
          <g className="genie-hand">
            <path d="M208 159L211 140Q214 129 220 136L221 149L234 144Q247 145 242 156L227 171Q213 174 208 159Z" fill="#f2f2f2" stroke="#202020" strokeWidth="3"/>
            <path d="M224 153L234 150M224 160L231 157" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
          </g>
        </g>
        <g className="genie-head">
          <path d="M83 97Q76 77 67 90Q59 105 80 116M195 97Q203 78 211 91Q220 105 198 116" fill="#aaa" stroke="#292929" strokeWidth="3"/>
          <path d="M78 75Q137 50 200 78L194 126Q183 159 140 163Q95 160 82 128Z" fill="#d8d8d8" stroke="#202020" strokeWidth="4"/>
          <path className="genie-brow-left" d="M94 93Q105 85 117 92" stroke="#353535" strokeWidth="5" strokeLinecap="round"/>
          <path className="genie-brow-right" d="M157 89Q172 81 184 90" stroke="#353535" strokeWidth="5" strokeLinecap="round"/>
          <g className="genie-eyes"><ellipse cx="107" cy="106" rx="12" ry="15" fill="#fcfcfc"/><ellipse cx="170" cy="104" rx="12" ry="15" fill="#fcfcfc"/><ellipse cx="111" cy="106" rx="5" ry="8" fill="#171717"/><ellipse cx="174" cy="104" rx="5" ry="8" fill="#171717"/><circle cx="113" cy="103" r="2" fill="white"/><circle cx="176" cy="101" r="2" fill="white"/></g>
          <path d="M137 105L131 120Q141 127 149 119" fill="#b2b2b2" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
          <path className="genie-mouth" d="M119 138Q141 157 165 134Q145 144 119 138Z" fill="#242424"/>
          <path d="M119 128Q129 120 141 128Q155 119 166 127L179 128Q169 142 143 133Q117 144 104 131Z" fill="#555"/>
          <g className="genie-hat"><path d="M80 74Q81 25 136 26Q192 23 199 73" fill="#ececec" stroke="#292929" strokeWidth="4"/><path d="M123 28V64M148 27V63" stroke="#b3b3b3" strokeWidth="5"/><path d="M69 72Q134 60 207 70L209 84Q141 75 69 86Z" fill="#f6f6f6" stroke="#292929" strokeWidth="3"/><rect x="123" y="41" width="29" height="21" rx="6" fill="#303030"/><path d="M140 44L132 53H138L134 60L146 50H140L144 44Z" fill="#eee"/></g>
        </g>
      </g>
      <g className="genie-sparks" stroke="#eee" strokeWidth="3" strokeLinecap="round"><path d="M49 90V102M43 96H55M230 66V80M223 73H237M225 223L234 232M234 223L225 232"/></g>
    </svg>
  </div>;
}

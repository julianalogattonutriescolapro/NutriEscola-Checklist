/** Ramo de folhas discreto, usado em cantos de telas e cards. */
export function RamoFolhas({ style, size = 90 }: { style?: React.CSSProperties; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 90 90" fill="none" className="decor-folha" style={style} aria-hidden="true">
      <path d="M10 80 C 25 60, 35 40, 30 15" stroke="#A8C3A0" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="24" cy="45" rx="7" ry="13" transform="rotate(-30 24 45)" fill="#A8C3A0" opacity="0.55" />
      <ellipse cx="33" cy="28" rx="6" ry="11" transform="rotate(-15 33 28)" fill="#C9A66B" opacity="0.45" />
      <ellipse cx="16" cy="62" rx="6" ry="11" transform="rotate(-45 16 62)" fill="#A8C3A0" opacity="0.4" />
    </svg>
  )
}

/** Flor pequena e delicada, de 4 pétalas, usada como assinatura da marca. */
export function FlorPequena({ style, size = 22, cor = '#E8B4B8' }: { style?: React.CSSProperties; size?: number; cor?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} aria-hidden="true">
      <ellipse cx="12" cy="7" rx="3.4" ry="5" fill={cor} opacity="0.85" />
      <ellipse cx="12" cy="17" rx="3.4" ry="5" fill={cor} opacity="0.85" />
      <ellipse cx="7" cy="12" rx="5" ry="3.4" fill={cor} opacity="0.7" />
      <ellipse cx="17" cy="12" rx="5" ry="3.4" fill={cor} opacity="0.7" />
      <circle cx="12" cy="12" r="2.3" fill="#C9A66B" />
    </svg>
  )
}

import logoUrl from '../assets/logo-transparente.png'

/**
 * Logotype oficial da marca: folha dourada com monograma "JL", em fundo
 * transparente, acompanhada do nome em duas linhas ("Logatto Flow" +
 * "FINANÇAS"). Usado no login, dashboard, menu lateral e relatórios.
 *
 * @param variante "completo" mostra o símbolo + o nome por extenso;
 *                 "simbolo" mostra apenas a folha (ex: ícones compactos).
 */
export function LogoMarca({
  tamanho = 46,
  variante = 'completo',
  direcao = 'linha',
  tituloTamanho
}: {
  tamanho?: number
  variante?: 'completo' | 'simbolo'
  /** 'linha' (lado a lado) ou 'coluna' (empilhado e centralizado — usado no menu lateral e telas de autenticação) */
  direcao?: 'linha' | 'coluna'
  /** Sobrescreve o tamanho do título em px fixo. Se omitido, usa tamanho fluido (clamp) que nunca quebra linha. */
  tituloTamanho?: number
}) {
  const empilhado = direcao === 'coluna'
  const tamanhoFixo = tituloTamanho !== undefined

  return (
    <span style={{
      display: 'inline-flex',
      flexDirection: empilhado ? 'column' : 'row',
      flexWrap: 'nowrap',
      alignItems: 'center',
      justifyContent: 'center',
      gap: empilhado ? 8 : 14,
      maxWidth: '100%'
    }}>
      <img src={logoUrl} alt="Logatto Flow Finance" style={{ height: tamanho, width: 'auto', display: 'block', flexShrink: 0 }} />
      {variante === 'completo' && (
        <span style={{
          display: 'flex', flexDirection: 'column', alignItems: empilhado ? 'center' : 'flex-start',
          lineHeight: 1.15, maxWidth: '100%'
        }}>
          <span
            className={tamanhoFixo ? undefined : 'logo-titulo-fluido'}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: tamanhoFixo ? tituloTamanho : undefined,
              fontWeight: 700, color: '#3E5442', textAlign: empilhado ? 'center' : 'left',
              whiteSpace: 'nowrap'
            }}
          >
            Logatto <em style={{ fontStyle: 'italic' }}>Flow</em>
          </span>
          <span
            className={tamanhoFixo ? undefined : 'logo-subtitulo-fluido'}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: tamanhoFixo ? tituloTamanho * 0.6 : undefined,
              fontWeight: 500, color: '#6A7E68', letterSpacing: '1.5px', marginTop: 3,
              textTransform: 'uppercase', whiteSpace: 'nowrap'
            }}
          >
            Finanças
          </span>
        </span>
      )}
    </span>
  )
}

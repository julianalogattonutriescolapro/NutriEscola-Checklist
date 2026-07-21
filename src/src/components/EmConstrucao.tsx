import { RamoFolhas } from './Decoracoes'

export default function EmConstrucao({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>{titulo}</h1>
          <p>{descricao}</p>
        </div>
      </div>
      <div className="card empty-state">
        <RamoFolhas size={90} style={{ top: -10, right: -10 }} />
        <div className="display">Este módulo será construído na próxima etapa</div>
        <p>A fundação (banco de dados, autenticação e estrutura) já está pronta e conectada ao Supabase.</p>
      </div>
    </>
  )
}

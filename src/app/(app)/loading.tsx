export default function Carregando() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="animate-pulse space-y-6">
      <div className="h-9 w-56 rounded-xl bg-marinho-100/70" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-cartao bg-white shadow-cartao" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="h-80 rounded-cartao bg-white shadow-cartao lg:col-span-7" />
        <div className="h-80 rounded-cartao bg-white shadow-cartao lg:col-span-5" />
      </div>
    </div>
  );
}

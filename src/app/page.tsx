export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
      {/* Zona de arrastre a pantalla completa (vacía hasta el Hito 4). */}
      <div className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center rounded-surface border-2 border-dashed border-line-strong px-6 text-center">
        <h1 className="text-subheading text-text">Arrastra una imagen o un vídeo aquí</h1>
        <p className="mt-2 text-small text-text-secondary">
          Se convierte y edita en tu navegador. Nada se sube a ningún servidor.
        </p>
      </div>
    </main>
  );
}

"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="fallback-page"><h1>Не удалось загрузить каталог</h1><p>Данные камер временно недоступны. Попробуйте ещё раз.</p><button className="secondary-button" onClick={reset}>Повторить</button></main>;
}

"use client";

import { useRef } from "react";
import { countCameras, countDocumentedSites, type Camera } from "@/lib/camera";
import Icon from "./Icon";

export default function SourceOverview({ cameras }: { cameras: Camera[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const itsCount = cameras.filter((camera) => camera.category === "its").length;
  const osmCount = cameras.filter((camera) => camera.sourceKind === "open-map").length;
  const sites = cameras.filter((camera) => camera.recordKind === "site");
  return <>
    <button className="sources-button" onClick={() => dialog.current?.showModal()}>Источники и количество ↗</button>
    <dialog ref={dialog} className="sources-dialog" aria-labelledby="sources-title">
      <div className="sources-heading"><h2 id="sources-title">Что известно о камерах Opole</h2><button className="icon-button" aria-label="Закрыть источники" onClick={() => dialog.current?.close()}><Icon name="close" /></button></div>
      <div className="sources-scroll">
        <p>В каталоге {countCameras(cameras)} камер и {countDocumentedSites(cameras)} объектов с видеонаблюдением. Это неполный перечень из открытых источников, а не число всех работающих камер города.</p>
        <p>Объекты отмечены символом <b>i</b>. Их общие числа не прибавляются к отдельным камерам: системы могут пересекаться, а точные количества часто неизвестны.</p>
        <table><caption>Опубликованные сведения · проверка источников 03.09.2026</caption><thead><tr><th>Источник</th><th>Количество и дата</th></tr></thead><tbody>
          <tr><td><a href="https://its.mzd.opole.pl/api/cameras" target="_blank" rel="noopener noreferrer">Публичный каталог ITS ↗</a></td><td>{itsCount} записей · 03.09.2026</td></tr>
          <tr><td><a href="https://www.opole.pl/sites/default/files/field_attachment/2026-05/Raport%20o%20stanie%20Miasta%20Opola%20za%202025%20r..pdf#page=49" target="_blank" rel="noopener noreferrer">Отчёт города за 2025 год ↗</a></td><td>128 городских камер и 154 ITS. Число ITS из отчёта не добавляется к текущему каталогу.</td></tr>
          <tr><td><a href="https://www.archiwum.bip.um.opole.pl/zalaczniki/45612/Klauzula_informacyjna_-_monitoring_Dynamicznej_Informacji_Pasazerskiej-1_02-11-2021_09-35-05.pdf" target="_blank" rel="noopener noreferrer">Остановочные табло DIP ↗</a></td><td>45 табло с камерами в 35 остановочных комплексах · 2021. Не число отдельных камер. Состояние сегодня неизвестно.</td></tr>
          <tr><td><a href="https://czasnaopole.pl/taka-jest-itaka-arena/" target="_blank" rel="noopener noreferrer">Itaka Arena ↗</a></td><td>192 камеры на объекте · 21.03.2025</td></tr>
          <tr><td><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors ↗</a></td><td>{osmCount} добавленных точек. Ещё 3 близкие точки требуют проверки на совпадение с ITS. Оператор неизвестен.</td></tr>
          <tr><td>Частные объекты</td><td>{sites.filter((camera) => camera.category === "private").length} объекта с публичными источниками. Число камер не опубликовано. Ссылки — в карточках.</td></tr>
        </tbody></table>
        <p>У {sites.filter((camera) => camera.cameraCount === null).length} объектов число камер неизвестно. Архивные сведения помечены годом. Точки объектов — приблизительные ориентиры; направления и сектора для них не выдумываются.</p>
        <p>Четыре камеры у Armii Krajowej 20 добавлены со слов пользователя и входят в счётчик камер с отдельной оранжевой пометкой.</p>
        <p>Проекты будущих установок, сведения без надёжной привязки к месту и возможные повторы не превращены в новые камеры. Наличие записи не означает доступ к видео.</p>
      </div>
    </dialog>
  </>;
}

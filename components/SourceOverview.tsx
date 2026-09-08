"use client";

import { useRef } from "react";
import { countCameras, countDocumentedSites, type Camera } from "@/lib/camera";
import Icon from "./Icon";
import { useI18n } from "@/lib/i18n";

export default function SourceOverview({ cameras }: { cameras: Camera[] }) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const itsCount = cameras.filter((camera) => camera.category === "its").length;
  const osmCount = cameras.filter(
    (camera) => camera.sourceKind === "open-map",
  ).length;
  const sites = cameras.filter((camera) => camera.recordKind === "site");
  return (
    <>
      <button
        className="sources-button"
        onClick={() => dialog.current?.showModal()}
      >
        {t("sourcesButton")}
      </button>
      <dialog
        ref={dialog}
        className="sources-dialog"
        aria-labelledby="sources-title"
      >
        <div className="sources-heading">
          <h2 id="sources-title">{t("sourcesTitle")}</h2>
          <button
            className="icon-button"
            aria-label={t("closeSources")}
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="sources-scroll">
          <p>
            {" "}
            {t("detail26")} {countCameras(cameras)} {t("detail27")}{" "}
            {countDocumentedSites(cameras)} {t("detail28")}{" "}
          </p>
          <p>
            {" "}
            {t("detail29")} <b>i</b> {t("detail30")}{" "}
          </p>
          <table>
            <caption> {t("detail31")} </caption>
            <thead>
              <tr>
                <th> {t("detail32")} </th>
                <th> {t("detail33")} </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <a
                    href="https://its.mzd.opole.pl/api/cameras"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {" "}
                    {t("detail34")}{" "}
                  </a>
                </td>
                <td>
                  {itsCount} {t("detail35")}{" "}
                </td>
              </tr>
              <tr>
                <td>
                  <a
                    href="https://www.opole.pl/sites/default/files/field_attachment/2026-05/Raport%20o%20stanie%20Miasta%20Opola%20za%202025%20r..pdf#page=49"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {" "}
                    {t("detail36")}{" "}
                  </a>
                </td>
                <td> {t("detail37")} </td>
              </tr>
              <tr>
                <td>
                  <a
                    href="https://www.archiwum.bip.um.opole.pl/zalaczniki/45612/Klauzula_informacyjna_-_monitoring_Dynamicznej_Informacji_Pasazerskiej-1_02-11-2021_09-35-05.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {" "}
                    {t("detail38")}{" "}
                  </a>
                </td>
                <td> {t("detail39")} </td>
              </tr>
              <tr>
                <td>
                  <a
                    href="https://czasnaopole.pl/taka-jest-itaka-arena/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Itaka Arena ↗
                  </a>
                </td>
                <td> {t("detail40")} </td>
              </tr>
              <tr>
                <td>
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    OpenStreetMap contributors ↗
                  </a>
                </td>
                <td>
                  {osmCount} {t("detail41")}{" "}
                </td>
              </tr>
              <tr>
                <td> {t("detail42")} </td>
                <td>
                  {
                    sites.filter((camera) => camera.category === "private")
                      .length
                  }{" "}
                  {t("detail43")}{" "}
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            {" "}
            {t("detail44")}{" "}
            {sites.filter((camera) => camera.cameraCount === null).length}{" "}
            {t("detail45")}{" "}
          </p>
          <p> {t("detail46")} </p>
          <p> {t("detail47")} </p>
        </div>
      </dialog>
    </>
  );
}

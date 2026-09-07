"use client";

import { useState } from "react";
import type { Camera } from "@/lib/camera";
import { cameraLink, isLocalLink } from "@/lib/camera-preferences";
import Icon from "./Icon";
import CameraViewAction from "./CameraViewAction";
import CameraStatusBadge from "./CameraStatusBadge";
import type { CameraAvailability } from "@/lib/map-features";
import { useI18n } from "@/lib/i18n";

type Props = {
  camera: Camera;
  availability?: CameraAvailability;
  onClose: () => void;
  favorite: boolean;
  favoritesReady: boolean;
  onToggleFavorite: () => void;
  onSnapshot: (camera: Camera) => void;
};

export default function CameraDetails({
  camera,
  availability,
  onClose,
  favorite,
  favoritesReady,
  onToggleFavorite,
  onSnapshot,
}: Props) {
  const { locale, t } = useI18n();
  const [share, setShare] = useState<{ url: string; copied: boolean } | null>(
    null,
  );
  const [copying, setCopying] = useState(false);
  async function copyLink() {
    const url = cameraLink(window.location.href, camera.id, true);
    setCopying(true);
    try {
      await navigator.clipboard.writeText(url);
      setShare({ url, copied: true });
    } catch {
      setShare({ url, copied: false });
    } finally {
      setCopying(false);
    }
  }
  const approximate = camera.opticsVerified ? "" : "≈";
  const availabilityTime = availability?.sourceTime ?? availability?.checkedAt;
  const categoryName =
    camera.category === "its"
      ? "ITS Opole"
      : t(
          camera.category === "public"
            ? "layerPublic"
            : camera.category === "city"
              ? "layerCity"
              : camera.category === "private"
                ? "layerPrivate"
                : "layerOther",
        );
  return (
    <section
      className="details-card"
      aria-labelledby="camera-details-title"
      data-camera-id={camera.id}
    >
      <div className="details-heading">
        <span className="eyebrow">
          {t(
            camera.recordKind === "site"
              ? "videoSite"
              : camera.reportedCount
                ? "cameraGroup"
                : "selectCamera",
          )}
        </span>
        <button
          className="icon-button"
          aria-label={t("closeCard")}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="details-scroll">
        <div className="details-type">
          <Icon name="camera" /> {categoryName}
        </div>
        <h2 id="camera-details-title" tabIndex={-1}>
          {camera.name}
        </h2>
        <p className="details-location">
          <Icon name="pin" /> {camera.street}
        </p>
        <div className="availability-card">
          <span>{t("statusTitle")}</span>
          <CameraStatusBadge value={availability} />
          {availabilityTime && (
            <time dateTime={availabilityTime}>
              {t(availability?.sourceTime ? "lastImage" : "lastCheck")}:{" "}
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(availabilityTime))}
            </time>
          )}
          <p>{t("statusHint")}</p>
        </div>
        {camera.sourceKind === "user-report" && (
          <p className="report-notice">
            <strong>{t("reportedNotice")}</strong>
            <span>
              {t("groupCount")} {camera.reportedCount}. {t("reportAnchor")}
            </span>
          </p>
        )}
        {camera.recordKind === "site" && (
          <p className="object-notice">
            <strong>
              {camera.cameraCount === null
                ? t("objectUnknown")
                : t("sourceCount") +
                  " " +
                  camera.cameraCount +
                  " " +
                  t("cameras")}
            </strong>
            <span>{t("objectAnchor")}</span>
          </p>
        )}
        {camera.sourceKind === "open-map" && (
          <p className="object-notice">{t("communityNotice")}</p>
        )}
        <div className="camera-actions">
          <button
            className="utility-button favorite-button"
            aria-pressed={favorite}
            disabled={!favoritesReady}
            onClick={onToggleFavorite}
          >
            <Icon name="star" />{" "}
            {favorite ? t("inFavorites") : t("favoriteAdd")}
          </button>
          <button
            className="utility-button"
            disabled={copying}
            onClick={copyLink}
          >
            <Icon name="link" /> {copying ? t("copying") : t("link")}
          </button>
        </div>
        {share && (
          <div className="share-result">
            <p role="status">
              {share.copied ? t("copied") : t("copyError")}
              {isLocalLink(share.url) && " " + t("localOnly")}
            </p>
            {!share.copied && (
              <input
                className="share-url"
                aria-label={t("cameraLink")}
                readOnly
                value={share.url}
                onFocus={(event) => event.target.select()}
              />
            )}
          </div>
        )}
        <p
          className={
            "verification-badge" + (camera.verified ? " verified" : "")
          }
        >
          {t(camera.verified ? "coordsVerified" : "coordsUnverified")}
        </p>
        <div className="view-parameters">
          <div className="bearing-diagram" aria-hidden="true">
            <span>N</span>
            <svg viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="29" />
              <path d="M40 5v7M40 68v7M5 40h7M68 40h7" />
              {camera.heading !== null && (
                <g transform={"rotate(" + camera.heading + " 40 40)"}>
                  <path className="bearing-cone" d="M40 40 23 14Q40 3 57 14Z" />
                  <path className="bearing-arrow" d="M40 45V15m-5 7 5-7 5 7" />
                </g>
              )}
              <circle className="bearing-origin" cx="40" cy="40" r="3" />
            </svg>
          </div>
          <dl className="optics-grid">
            <div>
              <dt>{t("direction")}</dt>
              <dd>
                {camera.heading === null
                  ? t("noData")
                  : approximate + camera.heading + "°"}
              </dd>
            </div>
            <div>
              <dt>{t("viewAngle")}</dt>
              <dd>
                {camera.fov === null
                  ? t("noData")
                  : approximate + camera.fov + "°"}
              </dd>
            </div>
            <div>
              <dt>{t("range")}</dt>
              <dd>
                {camera.rangeMeters === null
                  ? t("noData")
                  : approximate + camera.rangeMeters + " " + t("detail16")}
              </dd>
            </div>
          </dl>
        </div>
        <p className="optics-note">
          {t(
            camera.heading === null ||
              camera.fov === null ||
              camera.rangeMeters === null
              ? "sectorMissing"
              : camera.opticsVerified
                ? "opticsConfirmed"
                : "sectorIllustration",
          )}
        </p>
        <dl className="source-details">
          <div>
            <dt>
              {t(
                camera.sourceKind === "user-report" ||
                  camera.recordKind === "site"
                  ? "anchorCoordinates"
                  : "coordinates",
              )}
            </dt>
            <dd>
              {camera.lat.toFixed(5)}, {camera.lng.toFixed(5)}
            </dd>
          </div>
          <div>
            <dt>{t("source")}</dt>
            <dd>
              {camera.sourceUrl ? (
                <a
                  href={camera.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {camera.sourceLabel} ↗
                </a>
              ) : (
                camera.sourceLabel
              )}
            </dd>
          </div>
          {camera.sourceDate && (
            <div>
              <dt>{t("sourceDate")}</dt>
              <dd>{camera.sourceDate}</dd>
            </div>
          )}
          {camera.retrievedAt && (
            <div>
              <dt>{t("sourceViewed")}</dt>
              <dd>
                {camera.retrievedAt} · {t("cameraUnchecked")}
              </dd>
            </div>
          )}
        </dl>
        {camera.positionSourceUrl && (
          <p className="position-source">
            <a
              href={camera.positionSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {camera.positionSourceLabel ?? t("positionDefault")} ↗
            </a>
          </p>
        )}
        {camera.note && <p className="camera-note">{camera.note}</p>}
      </div>
      {camera.publicViewUrl || camera.snapshotSourceUrl ? (
        <CameraViewAction camera={camera} onSnapshot={onSnapshot} />
      ) : (
        <p className="no-stream">{t("noPublicView")}</p>
      )}
    </section>
  );
}

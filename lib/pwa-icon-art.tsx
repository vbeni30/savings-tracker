import { appIconDataUri } from "@/lib/pwa-icon-svg";

type PwaIconArtProps = {
  size: number;
};

export function PwaIconArt({ size }: PwaIconArtProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={appIconDataUri(size)} alt="" width={size} height={size} />
  );
}

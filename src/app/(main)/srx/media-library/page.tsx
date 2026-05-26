import { getSrxMediaLibrarySnapshot } from "@/lib/srx-media-library";

import { MediaLibraryManager } from "./_components/media-library-manager";

export default async function Page() {
  const snapshot = await getSrxMediaLibrarySnapshot();

  return <MediaLibraryManager initialSnapshot={snapshot} />;
}

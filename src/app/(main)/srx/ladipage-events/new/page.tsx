import AdminTemplateEditor from "@/app/(admin)/admin/templates/[slug]/ui";
import { defaultConfig } from "@/lib/form-template/defaultConfig";

function createInitialConfig() {
  return structuredClone(defaultConfig);
}

export default function Page() {
  const initialConfig = createInitialConfig();

  return (
    <AdminTemplateEditor
      slug=""
      initialName="Ladipage sự kiện mới"
      initialConfig={initialConfig}
      editorTitle="Tạo Ladipage sự kiện"
      redirectToEditBasePath="/srx/ladipage-events"
    />
  );
}

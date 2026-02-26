import { FileManager } from "@/components/files/file-manager";

export const metadata = {
  title: "Files | knobase",
};

export default function FilesPage() {
  return (
    <div className="h-screen w-full bg-neutral-50">
      <FileManager />
    </div>
  );
}

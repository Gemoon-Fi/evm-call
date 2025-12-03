export default function Upload({
  uploadCb,
  text,
}: {
  uploadCb: (file: File) => void;
  text: string;
}): React.JSX.Element {
  return (
    <input
      className="p-2 border-2 border-black rounded-lg cursor-pointer"
      type="file"
      onChange={(e) => uploadCb(e.target.files?.[0] as File)}
    />
  );
}

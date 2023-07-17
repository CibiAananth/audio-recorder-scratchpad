/* eslint-disable @typescript-eslint/no-misused-promises */
import { supabase } from "./supabase";

/**
 * A component that allows the user to pick a FILE from the local filesystem.
 */
export default function Picker() {
  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.item(0);
    if (!file) {
      return;
    }

    const auth = await supabase.auth.getSession();
    const storage = await supabase.storage
      .from("recording")
      .upload(`${auth.data.session!.user.id}/${file.name}`, file);
    console.log("auth", auth);
    console.log("storage", storage);
  };

  return (
    <>
      <input type="file" onChange={handleFile} />
    </>
  );
}

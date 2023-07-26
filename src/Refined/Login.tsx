/* eslint-disable @typescript-eslint/no-misused-promises */
import { useState } from "react";
import { supabase } from "./supabase";
import { useEffect } from "react";

export function LoginForm(): React.ReactNode {
  const [inputs, setInputs] = useState<{ email: string }>({ email: "" });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const name = event.target.name;
    const value = event.target.value;
    setInputs((values) => ({ ...values, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log(inputs);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { data, error } = await supabase.auth.signInWithOtp({
      email: inputs.email,
      options: {
        emailRedirectTo: "http://localhost:5173",
      },
    });

    console.log(data, error);
  };

  useEffect(() => {
    const a = async () => {
      const user = await supabase.auth.getUser();
      const session = await supabase.auth.getSession();
      console.log(session.data, user.data);
    };
    a();
  }, []);

  async function handleLogout() {
    const data = await supabase.auth.signOut();
    console.log(data);
  }

  const randomUsername = () => {
    return `user${Date.now().toString()}@example.com`;
  };

  // useEffect(() => {
  //   (async () => {
  //     await supabase.auth.signUp({
  //       email: "212@alsk.com",
  //       password: "212@alsk.com",
  //     });
  //     const user = await supabase.auth.getUser();
  //     console.log(user);
  //   })();
  // }, []);

  return (
    <>
      <form onSubmit={handleSubmit}>
        <label>
          Email:
          <input
            type="email"
            name="email"
            value={inputs.email}
            onChange={handleChange}
          />
        </label>
        <input type="submit" />
      </form>
      <button onClick={handleLogout}>Logout</button>
    </>
  );
}

import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { List } from "./Refined/List.tsx";
import { LoginForm } from "./Refined/Login";
import Recorder from "./Refined/App.tsx";
import Picker from "./Refined/Picker.tsx";
import Home from "./Refined/Home.tsx";

import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Picker />,
  },
  {
    path: "/list",
    element: <List />,
  },
  {
    path: "/login",
    element: <LoginForm />,
  },
  {
    path: "/recorder",
    element: <Recorder />,
  },
  {
    path: "/picker",
    element: <Home />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);

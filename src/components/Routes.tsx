import { Routes, Route } from "react-router-dom";
import Home from "./Home";

const ProjectRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
};

export default ProjectRoutes;

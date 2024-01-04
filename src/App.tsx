import { BrowserRouter } from "react-router-dom";
import { Col, Row, Tab } from "react-bootstrap";
import Routes from "./components/Routes";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes />
      </BrowserRouter>
    </div>
  );
}

export default App;

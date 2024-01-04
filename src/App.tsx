import { BrowserRouter } from "react-router-dom";
import Routes from "./components/Routes";
import TagManager from "react-gtm-module";

const TagManagerArgs = {
  gtmId: "GTM-KDK7RV2S",
};

TagManager.initialize(TagManagerArgs);
TagManager.dataLayer({
  dataLayer: {
    event: "pageview",
    path: "/home/",
  },
});

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

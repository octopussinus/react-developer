import { BrowserRouter as Router, Routes, Route } from "react-router";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import { customPages } from "./shared/utils/pageDiscovery";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route element={<AppLayout />}>
            {/* Dashboard Home */}
            <Route index path="/" element={<Home />} />

            {/* Auto-discovered Custom Pages */}
            {customPages.map((page) => (
              <Route
                key={page.path}
                path={page.path}
                element={<page.component />}
              />
            ))}
          </Route>
        </Routes>
      </Router>
    </>
  );
}

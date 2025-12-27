import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import MainLayout from '@/components/layouts/MainLayout';
import routes from './routes';
import { AuthProvider } from '@/contexts/AuthContext';
import { RouteGuard } from '@/components/common/RouteGuard';
import { Toaster } from 'sonner';

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <>
      <IntersectObserver />
      {isLoginPage ? (
        <Routes>
          {routes.map((route, index) => (
            <Route
              key={index}
              path={route.path}
              element={route.element}
            />
          ))}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <MainLayout>
          <Routes>
            {routes.map((route, index) => (
              <Route
                key={index}
                path={route.path}
                element={route.element}
              />
            ))}
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </MainLayout>
      )}
      <Toaster />
    </>
  );
}

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <RouteGuard>
          <AppContent />
        </RouteGuard>
      </AuthProvider>
    </Router>
  );
};

export default App;

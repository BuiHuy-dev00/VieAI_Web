import {createTheme, CssBaseline, ThemeProvider} from "@mui/material";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import HomeView from "./views/HomeView.tsx";
import {AuthProvider} from "./components/Auth/AuthContext.tsx";
import ProtectedRoute from "./components/Auth/ProtectedRoute.tsx";
import {DataProvider} from "./components/DataHandler/DataContext.tsx";
import AuthenticationLoginView from "./views/AuthenticationLoginView.tsx";
import AuthenticationSignupView from "./views/AuthenticationSignupView.tsx";
import PaymentCheckoutView from "./views/PaymentCheckoutView.tsx";
import AdminRoute from "./components/Auth/AdminRoute.tsx";
import AdminUsersView from "./views/AdminUsersView.tsx";

const appTheme = createTheme({
    typography: {
        fontFamily: `"Inter", "Noto Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
        fontSize: 12,
    },
});

const App = () => {
    return (
        <AuthProvider>
            <ThemeProvider theme={appTheme}>
                <CssBaseline/>
                <BrowserRouter>
                    <Routes>
                        <Route element={<ProtectedRoute/>}>
                            <Route path="/" element={
                                <DataProvider>
                                    <HomeView/>
                                </DataProvider>
                            }/>
                            <Route path="/payment" element={<PaymentCheckoutView/>}/>
                            <Route element={<AdminRoute/>}>
                                <Route path="/admin" element={<AdminUsersView/>}/>
                            </Route>
                        </Route>
                        <Route path="/login" element={<AuthenticationLoginView/>}/>
                        <Route path="/admin/signup" element={<AuthenticationSignupView/>}/>
                    </Routes>
                </BrowserRouter>
            </ThemeProvider>
        </AuthProvider>
    )
}

export default App

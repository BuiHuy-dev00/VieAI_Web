import type { FC, FormEvent } from "react";
import { useState } from "react";
import {
    Box,
    Stack,
    TextField,
    Button,
    IconButton,
    InputAdornment,
    Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useNavigate } from "react-router-dom";
import {useAuth} from "../Auth/AuthContext.tsx";

type Props = {
    title?: string;
    subtitle?: string;
};

const Login: FC<Props> = ({
                              title = "Welcome Back!",
                              subtitle = "Please enter login details below",
                          }) => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [touched, setTouched] = useState({ email: false, password: false });

    const [submitting, setSubmitting] = useState(false);
    const [errMsg, setErrMsg] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setTouched({ email: true, password: true });
        setErrMsg(null);

        if (!email || !password) return;

        try {
            setSubmitting(true);
            await login({ email, password });
            navigate("/", { replace: true });
        } catch (e: any) {
            setErrMsg(e?.message ?? "Login failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box>
            <Box sx={{ mt: 1, mb: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
                    {title}
                </Typography>
                <Typography variant="body1" sx={{ mt: 1, color: "text.secondary" }}>
                    {subtitle}
                </Typography>
            </Box>

            <Stack component="form" spacing={2} onSubmit={handleSubmit} noValidate>
                <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((s) => ({ ...s, email: true }))}
                    required
                    error={touched.email && !email}
                    helperText={touched.email && !email ? "Email is required" : " "}
                    fullWidth
                    autoComplete="email"
                />

                <TextField
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((s) => ({ ...s, password: true }))}
                    required
                    error={touched.password && !password}
                    helperText={touched.password && !password ? "Password is required" : " "}
                    fullWidth
                    autoComplete="current-password"
                    slotProps={{
                        input: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        onClick={() => setShowPassword((v) => !v)}
                                        edge="end"
                                        size="large"
                                    >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                />



                {errMsg && (
                    <Typography color="error" variant="body2">
                        {errMsg}
                    </Typography>
                )}

                <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={submitting}
                    loading={submitting}
                    sx={{ py: 1.4, borderRadius: 2 }}
                >
                    {submitting ? "Signing in..." : "Sign in"}
                </Button>
            </Stack>
        </Box>
    );
};

export default Login;

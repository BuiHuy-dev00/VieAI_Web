import type { FC, FormEvent } from "react";
import { useState } from "react";
import {
    Box,
    Stack,
    TextField,
    Button,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Auth/AuthContext.tsx";

const Register: FC = () => {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [errMsg, setErrMsg] = useState<string | null>(null);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrMsg(null);

        if (!name || !email || !password) return;

        try {
            setSubmitting(true);
            await register({ name, email, password });
            setShowSuccessDialog(true);
            setName("");
            setEmail("");
            setPassword("");
        } catch (e: any) {
            console.log("error", e);
            setErrMsg(e?.message ?? "Đăng ký thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRedirectToLogin = () => {
        setShowSuccessDialog(false);
        navigate("/login");
    };

    return (
        <>
            <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
                    Tạo tài khoản
                </Typography>

                <Stack component="form" spacing={2} onSubmit={onSubmit}>
                    <TextField
                        label="Họ và tên"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <TextField
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <TextField
                        label="Mật khẩu"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {errMsg && (
                        <Typography color="error" variant="body2">
                            {errMsg}
                        </Typography>
                    )}

                    <Button type="submit" variant="contained" disabled={submitting}>
                        Đăng ký
                    </Button>
                </Stack>
            </Box>

            <Dialog open={showSuccessDialog} onClose={() => {}} disableEscapeKeyDown>
                <DialogTitle>Tạo tài khoản thành công</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mt: 2 }}>
                        Tài khoản của bạn đã được tạo. Vui lòng đăng nhập bằng thông tin vừa đăng ký.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleRedirectToLogin} variant="contained">
                        Đi tới trang đăng nhập
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default Register;

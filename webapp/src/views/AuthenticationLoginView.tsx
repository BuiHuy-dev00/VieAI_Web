import type { FC } from "react";
import { useState, useEffect } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import Login from "../components/Login/Login.tsx";

const Page = styled(Box)(({ theme }) => ({
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.paper,
}));

const Shell = styled(Box)(({ theme }) => ({
    width: "min(1100px, 100%)",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: theme.shadows[10],
    background: theme.palette.background.default,
}));

const LeftPanel = styled(Box)(({ theme }) => ({
    flex: "1 1 520px",
    background: theme.palette.common.white,
    padding: theme.spacing(4),
    paddingTop: theme.spacing(0),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2.5),
}));

const RightPanel = styled(Box)(({ theme }) => ({
    flex: "1 1 520px",
    padding: theme.spacing(2),
    height: "100%",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    [theme.breakpoints.down("md")]: {
        display: "none",
    },
}));

const BrandRow = styled(Stack)(({ theme }) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(1),
}));

const PanelsWrap = styled(Box)(() => ({
    position: "relative",
    width: "100%",
    minHeight: 620,
    overflow: "hidden",
}));

const AuthPane = styled(Box)(({ theme }) => ({
    position: "absolute",
    top: 0,
    left: 0,
    width: "50%",
    height: "100%",
    zIndex: 3,
    transform: "translateX(0%)",
    willChange: "transform",
    boxShadow: "0 18px 60px rgba(0,0,0,0.18)",
    background: theme.palette.common.white,
}));

const ImagePane = styled(Box)(({ theme }) => ({
    position: "absolute",
    top: 0,
    left: "50%",
    width: "50%",
    height: "100%",
    zIndex: 1,
    transform: "translateX(0%)",
    willChange: "transform",
    [theme.breakpoints.down("md")]: {
        display: "none",
    },
}));

const AuthenticationLoginView: FC = () => {
    const images = ["/vie-1.png", "/vie-2.png", "/vie-3.png"];
    const [bgIndex, setBgIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setBgIndex((prev) => (prev + 1) % images.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [images.length]);

    const renderAuthBlock = () => (
        <LeftPanel>
            <BrandRow>
                <Box
                    component="img"
                    src="/logo.png"
                    alt="VieAI"
                    sx={{ width: 90, height: 90, objectFit: "contain" }}
                />
            </BrandRow>

            <Box sx={{ mt: 1 }}>
                <Login title="Chào mừng quay lại!" subtitle="Vui lòng nhập thông tin đăng nhập bên dưới" />
            </Box>
        </LeftPanel>
    );

    const renderIllustrationBlock = () => (
        <RightPanel>
            <Box sx={{ position: "absolute", inset: 0 }}>
                {images.map((src, index) => (
                    <Box
                        key={src}
                        component="img"
                        src={src}
                        alt={`nen-${index}`}
                        sx={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center",
                            opacity: bgIndex === index ? 1 : 0,
                            transition: "opacity 800ms ease",
                        }}
                    />
                ))}

                <Box
                    sx={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.35))",
                    }}
                />
            </Box>

            <Box
                sx={{
                    position: "relative",
                    zIndex: 2,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    p: 5,
                }}
            >
                <Box />

                <Box sx={{ textAlign: "center", pb: 1 }}>
                    <Typography sx={{ fontStyle: "italic", opacity: 0.95 }}>
                        Quản lý công việc dễ dàng và hiệu quả hơn cùng VieAI...
                    </Typography>

                    <Stack direction="row" justifyContent="center" spacing={1.2} sx={{ mt: 2 }}>
                        {images.map((_, i) => (
                            <Box
                                key={i}
                                sx={{
                                    width: bgIndex === i ? 26 : 10,
                                    height: 10,
                                    borderRadius: 999,
                                    background: "rgba(255,255,255,0.9)",
                                    opacity: bgIndex === i ? 1 : 0.5,
                                    transition: "all 300ms ease",
                                }}
                            />
                        ))}
                    </Stack>
                </Box>
            </Box>
        </RightPanel>
    );

    return (
        <Page>
            <Shell sx={{ position: "relative" }}>
                <PanelsWrap>
                    <AuthPane>{renderAuthBlock()}</AuthPane>
                    <ImagePane>{renderIllustrationBlock()}</ImagePane>
                </PanelsWrap>
            </Shell>
        </Page>
    );
};

export default AuthenticationLoginView;

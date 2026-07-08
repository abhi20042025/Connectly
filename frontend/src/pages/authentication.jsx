import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Snackbar, Typography, IconButton, Tooltip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AuthContext } from "../contexts/AuthContext";

// Create custom theme with dark palette presets for inputs
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#F5B041',
    },
    background: {
      default: '#0c0d12',
      paper: 'rgba(255, 255, 255, 0.03)',
    },
  },
  typography: {
    fontFamily: '"Outfit", "Inter", sans-serif',
  }
});

export default function Authentication() {
  const navigate = useNavigate();
  const { handleRegister, handleLogin } = useContext(AuthContext);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [formState, setFormState] = useState(0); // 0 = Login, 1 = Register
  const [open, setOpen] = useState(false);

  // Interactive Lamp States
  const [isOn, setIsOn] = useState(true);
  const [isPulling, setIsPulling] = useState(false);

  // Play realistic mechanical switch click sound using Web Audio API
  const playClickSound = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn("Audio Context blocked or not supported:", e.message);
    }
  };

  const handleToggleLamp = () => {
    setIsPulling(true);
    playClickSound();
    setIsOn(!isOn);
    setTimeout(() => {
      setIsPulling(false);
    }, 180);
  };

  const handleAuth = async () => {
    setError(""); 

    if (!username || !password || (formState === 1 && !name)) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      if (formState === 0) {
        await handleLogin(username, password);
      }

      if (formState === 1) {
        const result = await handleRegister(name, username, password);
        
        setMessage(result || "Registration Successful!");
        setOpen(true);

        setName("");
        setUsername("");
        setPassword("");
        setError("");

        setFormState(0);
      }
    } catch (err) {
      console.error("Authentication execution failed:", err);

      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      
      {/* Dynamic Styling Elements */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
        
        body {
          overflow-x: hidden;
          background-color: ${isOn ? '#14161e' : '#08090d'};
          transition: background-color 0.6s ease;
        }

        @keyframes slide-fade {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .glass-card {
          background: ${isOn ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.3)'} !important;
          backdrop-filter: blur(30px) !important;
          -webkit-backdrop-filter: blur(30px) !important;
          border: ${isOn ? '1px solid rgba(255, 224, 125, 0.15)' : '1px solid rgba(255, 255, 255, 0.05)'} !important;
          box-shadow: ${isOn 
            ? '0 30px 70px rgba(0, 0, 0, 0.65), 0 0 50px rgba(255, 224, 125, 0.05)' 
            : '0 20px 50px rgba(0, 0, 0, 0.8)'} !important;
          border-radius: 28px !important;
          padding: 40px !important;
          width: 100%;
          max-width: 460px;
          z-index: 10;
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .tab-transition-container {
          animation: slide-fade 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      {/* Main Container */}
      <Box
        className="page-transition"
        sx={{
          minHeight: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "center",
          justifyContent: "center",
          gap: { xs: "40px", md: "100px" },
          position: "relative",
          overflowY: "auto",
          padding: "40px 20px",
          background: isOn 
            ? 'radial-gradient(circle at 50% 50%, #1a1c24 0%, #08090c 100%)' 
            : 'radial-gradient(circle at 50% 50%, #0d0e11 0%, #040406 100%)',
          transition: 'background 0.6s ease'
        }}
      >
        {/* Back Button */}
        <Tooltip title="Back to Landing Page">
          <IconButton
            onClick={() => navigate('/')}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              color: 'white',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '8px',
              zIndex: 20
            }}
            sx={{ '&:hover': { background: 'rgba(255, 255, 255, 0.12)', transform: 'translateX(-2px)' } }}
          >
            <ArrowBackIcon style={{ fontSize: '1.2rem' }} />
          </IconButton>
        </Tooltip>

        {/* Radial light glow behind the lamp */}
        <div style={{
            position: 'absolute',
            width: '750px',
            height: '750px',
            background: 'radial-gradient(circle, rgba(255, 224, 125, 0.14) 0%, rgba(255, 224, 125, 0.04) 40%, rgba(0, 0, 0, 0) 70%)',
            top: '50%',
            left: '28%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            opacity: isOn ? 1 : 0,
            transition: 'opacity 0.6s ease',
            zIndex: 1
        }} />

        {/* Interactive Lamp Box */}
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            position: 'relative', 
            width: '280px', 
            height: '350px',
            zIndex: 5
          }}
        >
          {/* Lamp Shade (Dome) */}
          <div 
            onClick={handleToggleLamp}
            style={{
              width: '180px',
              height: '90px',
              borderRadius: '90px 90px 0 0',
              background: isOn ? 'linear-gradient(180deg, #FFFFFF 0%, #FFEBAF 100%)' : '#3a3a3a',
              boxShadow: isOn 
                ? '0 -15px 50px rgba(255, 224, 125, 0.85), 0 15px 45px rgba(255, 224, 125, 0.55), inset 0 -6px 15px rgba(255,255,255,0.85)' 
                : 'inset 0 3px 8px rgba(255,255,255,0.06), inset 0 -4px 10px rgba(0,0,0,0.5)',
              cursor: 'pointer',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              zIndex: 10
            }}
          />
          
          {/* Bulb/Light source inside shade */}
          <div style={{
              width: '45px',
              height: '25px',
              background: isOn ? '#FFF' : '#222',
              borderRadius: '50%',
              position: 'absolute',
              top: '78px',
              filter: isOn ? 'blur(6px)' : 'none',
              zIndex: 9,
              transition: 'all 0.6s ease'
          }} />

          {/* Stem/Base Pole */}
          <div style={{
              width: '12px',
              height: '210px',
              background: 'linear-gradient(90deg, #2b2b2b 0%, #444444 50%, #1c1c1c 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.04)',
              borderRight: '1px solid rgba(0,0,0,0.3)'
          }} />

          {/* Pedestal Base */}
          <div style={{
              width: '110px',
              height: '14px',
              borderRadius: '7px',
              background: 'linear-gradient(180deg, #383838 0%, #181818 100%)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.6)'
          }} />

          {/* Dangling Pull Chain */}
          <div 
            onClick={handleToggleLamp}
            style={{
              position: 'absolute',
              left: '140px', 
              top: '85px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transform: isPulling ? 'translateY(12px)' : 'translateY(0)',
              transition: 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              zIndex: 11
            }}
          >
            {/* Cord string */}
            <div style={{
                width: '2px',
                height: '85px',
                background: isOn ? '#c59d4c' : '#555',
                transition: 'background 0.6s ease'
            }} />
            {/* Pull Bead/Handle */}
            <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: isOn ? 'linear-gradient(135deg, #FFE07D 0%, #C59D4C 100%)' : '#5c5c5c',
                boxShadow: isOn ? '0 0 12px rgba(255, 224, 125, 0.7)' : 'none',
                transition: 'all 0.6s ease',
                border: '1px solid rgba(0,0,0,0.25)'
            }} />
          </div>
        </Box>

        {/* Floating Glassmorphic Authentication Card */}
        <Box component={Paper} elevation={0} className="glass-card">
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Logo and Icon header */}
            <Box 
              onClick={() => navigate('/')} 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'scale(1.05)' }
              }}
            >
              <Avatar 
                sx={{ 
                  m: 1, 
                  background: 'linear-gradient(135deg, #FFE07D 0%, #F5B041 100%)',
                  width: '46px',
                  height: '46px',
                  boxShadow: '0 4px 15px rgba(245, 176, 65, 0.25)',
                  color: '#422c00'
                }}
              >
                <LockOutlinedIcon />
              </Avatar>

              <h2 style={{ margin: '5px 0 5px 0', fontSize: '1.9rem', fontWeight: 800, letterSpacing: '0.5px', background: 'linear-gradient(to right, #FFFFFF, #FFE07D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Connectly
              </h2>
            </Box>

            <Typography variant="body2" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '25px', fontWeight: 600 }}>
              {formState === 0 ? "Welcome Back!" : "Join the Community"}
            </Typography>

            {/* Tab selection buttons */}
            <Box 
              sx={{ 
                mb: 4, 
                background: 'rgba(255, 255, 255, 0.04)', 
                padding: '6px', 
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                gap: '5px'
              }}
            >
              <Button
                variant={formState === 0 ? "contained" : "text"}
                onClick={() => {
                  setFormState(0);
                  setError("");
                }}
                style={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  padding: '8px 24px',
                  color: formState === 0 ? '#422c00' : 'rgba(255, 255, 255, 0.5)',
                  background: formState === 0 ? 'linear-gradient(135deg, #FFE07D 0%, #F5B041 100%)' : 'transparent',
                  boxShadow: formState === 0 ? '0 4px 15px rgba(245, 176, 65, 0.3)' : 'none'
                }}
              >
                Sign In
              </Button>

              <Button
                variant={formState === 1 ? "contained" : "text"}
                onClick={() => {
                  setFormState(1);
                  setError("");
                }}
                style={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  padding: '8px 24px',
                  color: formState === 1 ? '#422c00' : 'rgba(255, 255, 255, 0.5)',
                  background: formState === 1 ? 'linear-gradient(135deg, #FFE07D 0%, #F5B041 100%)' : 'transparent',
                  boxShadow: formState === 1 ? '0 4px 15px rgba(245, 176, 65, 0.3)' : 'none'
                }}
              >
                Sign Up
              </Button>
            </Box>

            {/* Form Fields container - Animated wrapper on tab change */}
            <Box 
              key={formState}
              component="form" 
              noValidate 
              className="tab-transition-container"
              sx={{ width: "100%" }}
            >
              {formState === 1 && (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  InputProps={{
                    style: {
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                    }
                  }}
                  sx={{
                    '& label.Mui-focused': { color: '#F5B041' },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                      '&.Mui-focused fieldset': { borderColor: '#F5B041' },
                    }
                  }}
                />
              )}

              <TextField
                margin="normal"
                required
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                InputProps={{
                  style: {
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                  }
                }}
                sx={{
                  '& label.Mui-focused': { color: '#F5B041' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&.Mui-focused fieldset': { borderColor: '#F5B041' },
                  }
                }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                InputProps={{
                  style: {
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                  }
                }}
                sx={{
                  '& label.Mui-focused': { color: '#F5B041' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&.Mui-focused fieldset': { borderColor: '#F5B041' },
                  }
                }}
              />

              {error && (
                <Typography 
                  style={{ 
                    color: '#ff4d4d', 
                    fontSize: '0.85rem', 
                    marginTop: '12px',
                    textAlign: 'left',
                    fontWeight: 600
                  }}
                >
                  {error}
                </Typography>
              )}

              <Button
                fullWidth
                variant="contained"
                onClick={handleAuth}
                style={{
                  background: 'linear-gradient(135deg, #FFE07D 0%, #F5B041 100%)',
                  color: '#422c00',
                  padding: '14px',
                  fontSize: '1rem',
                  fontWeight: 800,
                  borderRadius: '12px',
                  textTransform: 'none',
                  boxShadow: '0 8px 25px rgba(245, 176, 65, 0.35)',
                  transition: 'all 0.3s ease'
                }}
                sx={{
                  mt: 4,
                  mb: 2,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 30px rgba(245, 176, 65, 0.5)'
                  }
                }}
              >
                {formState === 0 ? "Sign In" : "Sign Up"}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Snackbar 
        open={open} 
        autoHideDuration={4000} 
        onClose={() => setOpen(false)}
        message={message} 
      />
    </ThemeProvider>
  );
}
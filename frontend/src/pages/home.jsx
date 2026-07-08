import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Button, TextField, IconButton, Box, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import LogoutIcon from '@mui/icons-material/Logout';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import ShieldIcon from '@mui/icons-material/Shield';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import StarsIcon from '@mui/icons-material/Stars';
import '../App.css';

export default function HomeComponent() {
    const navigate = useNavigate();
    const { addToUserHistory } = useContext(AuthContext);
    const [meetingCode, setMeetingCode] = useState('');
    const [securityOpen, setSecurityOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/auth");
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/auth");
    };

    const generateMeetingCode = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        let code = '';
        for (let i = 0; i < 9; i++) {
            if (i === 3 || i === 6) {
                code += '-';
            }
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const handleCreateMeeting = async () => {
        const code = generateMeetingCode();
        try {
            await addToUserHistory(code);
        } catch (err) {
            console.error("Failed to add meeting to history:", err);
        }
        navigate(`/${code}`);
    };

    const handleJoinMeeting = async () => {
        if (!meetingCode.trim()) return;
        
        // Sanitize code (remove slashes, spaces)
        const code = meetingCode.trim().toLowerCase().replace(/[^a-z-]/g, '');
        if (code) {
            try {
                await addToUserHistory(code);
            } catch (err) {
                console.error("Failed to add meeting to history:", err);
            }
            navigate(`/${code}`);
        }
    };

    return (
        <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'radial-gradient(circle at 10% 20%, rgb(4, 12, 34) 0%, rgb(1, 4, 16) 90%)', color: 'white', overflowX: 'hidden' }}>
            {/* Top Navigation */}
            <Box 
                component="nav" 
                sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: { xs: '15px 20px', md: '15px 40px' }, 
                    background: 'rgba(1, 4, 16, 0.6)', 
                    backdropFilter: 'blur(10px)', 
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)' 
                }}
            >
                <Box 
                    className='navHeader' 
                    onClick={() => navigate('/auth')}
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                    }}
                    sx={{ '&:hover': { transform: 'scale(1.04)' } }}
                >
                    <div style={{ background: 'linear-gradient(135deg, #FF9839 0%, #D97500 100%)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '20px', boxShadow: '0 4px 15px rgba(217, 117, 0, 0.4)' }}>
                        C
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 600, letterSpacing: '0.5px' }}>Connectly</h2>
                </Box>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <Tooltip title="Meeting History">
                        <IconButton 
                            onClick={() => navigate('/history')} 
                            style={{ 
                                color: 'white', 
                                background: 'rgba(255, 255, 255, 0.05)', 
                                border: '1px solid rgba(255, 255, 255, 0.1)', 
                                transition: 'all 0.3s ease' 
                            }}
                            sx={{ '&:hover': { background: 'rgba(255, 255, 255, 0.12)', transform: 'translateY(-2px)' } }}
                        >
                            <RestoreIcon />
                        </IconButton>
                    </Tooltip>
                    
                    <Button 
                        variant="outlined" 
                        color="error" 
                        startIcon={<LogoutIcon />}
                        onClick={handleLogout}
                        style={{ 
                            borderRadius: '8px', 
                            textTransform: 'none', 
                            fontWeight: '600', 
                            borderWidth: '1.5px',
                            padding: '6px 16px',
                            transition: 'all 0.3s ease'
                        }}
                        sx={{ '&:hover': { borderWidth: '1.5px', background: 'rgba(211, 47, 47, 0.08)', transform: 'translateY(-2px)' } }}
                    >
                        Logout
                    </Button>
                </div>
            </Box>

            {/* Main Content Dashboard */}
            <Box 
                className='meetContainer' 
                sx={{ 
                    flex: 1, 
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    padding: { xs: '30px 20px', md: '0 40px' }, 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    gap: { xs: '40px', md: '50px' },
                    overflowY: 'auto'
                }}
            >
                {/* Left Panel - Actions */}
                <Box 
                    className='leftPanel' 
                    sx={{ 
                        flex: 1, 
                        maxWidth: '600px', 
                        display: 'flex',
                        flexDirection: 'column', 
                        alignItems: { xs: 'center', md: 'flex-start' }, 
                        justifyContent: 'center', 
                        textAlign: { xs: 'center', md: 'left' } 
                    }}
                >
                    <Typography 
                        variant="h1" 
                        sx={{ 
                            fontSize: { xs: '2.2rem', sm: '2.7rem', md: '3.2rem' }, 
                            fontWeight: 800, 
                            lineHeight: 1.2, 
                            margin: '0 0 20px 0', 
                            background: 'linear-gradient(to right, #FFFFFF 30%, #FF9839 100%)', 
                            WebkitBackgroundClip: 'text', 
                            WebkitTextFillColor: 'transparent',
                            textAlign: { xs: 'center', md: 'left' }
                        }}
                    >
                        Premium video meetings.<br />Now free for everyone.
                    </Typography>
                    <Typography 
                        variant="body1" 
                        sx={{ 
                            fontSize: { xs: '1rem', md: '1.15rem' }, 
                            color: 'rgba(255, 255, 255, 0.65)', 
                            lineHeight: 1.6, 
                            margin: { xs: '0 0 25px 0', md: '0 0 40px 0' },
                            textAlign: { xs: 'center', md: 'left' }
                        }}
                    >
                        We re-engineered the service we built for secure meetings, Connectly, to make it free and accessible on any device.
                    </Typography>

                    <Box sx={{ display: 'flex', gap: '20px', width: '100%', flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                        <Button
                            variant="contained"
                            startIcon={<VideoCallIcon />}
                            onClick={handleCreateMeeting}
                            style={{
                                background: 'linear-gradient(135deg, #FF9839 0%, #D97500 100%)',
                                color: 'white',
                                padding: '14px 28px',
                                fontSize: '1rem',
                                fontWeight: 600,
                                borderRadius: '12px',
                                textTransform: 'none',
                                boxShadow: '0 8px 25px rgba(217, 117, 0, 0.3)',
                                transition: 'all 0.3s ease'
                            }}
                            sx={{ '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 30px rgba(217, 117, 0, 0.45)' } }}
                        >
                            New Meeting
                        </Button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
                            <TextField
                                placeholder="Enter meeting code"
                                value={meetingCode}
                                onChange={(e) => setMeetingCode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleJoinMeeting()}
                                InputProps={{
                                    startAdornment: <KeyboardIcon style={{ color: 'rgba(255, 255, 255, 0.4)', marginRight: '10px' }} />,
                                    style: {
                                        color: 'white',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                    }
                                }}
                                sx={{
                                    flex: 1,
                                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                    '& .MuiInputBase-input': { padding: '14px 14px 14px 0' }
                                }}
                            />
                            
                            <Button
                                variant="text"
                                onClick={handleJoinMeeting}
                                disabled={!meetingCode.trim()}
                                style={{
                                    color: meetingCode.trim() ? '#FF9839' : 'rgba(255, 255, 255, 0.3)',
                                    fontSize: '1.05rem',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    padding: '12px 20px',
                                    borderRadius: '12px',
                                    transition: 'all 0.2s'
                                }}
                                sx={{ '&:hover': { background: 'rgba(255, 152, 57, 0.08)' } }}
                            >
                                Join
                            </Button>
                        </div>
                    </Box>

                    <Box style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '35px 0' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.95rem' }}>Learn more about</span>
                        <a href="/" onClick={(e) => { e.preventDefault(); setSecurityOpen(true); }} style={{ color: '#FF9839', cursor: 'pointer', textDecoration: 'none', fontWeight: 600, borderBottom: '1px solid rgba(255, 152, 57, 0.3)', paddingBottom: '2px', transition: 'border-color 0.2s' }}>Connectly security</a>
                    </div>
                </Box>

                {/* Right Panel - Illustration & Glass Card */}
                <Box 
                    className='rightPanel' 
                    sx={{ 
                        flex: 1.1, 
                        display: 'flex', 
                        justifyContent: 'center', 
                        position: 'relative',
                        width: '100%',
                        mt: { xs: '20px', md: '0' },
                        mb: { xs: '30px', md: '0' }
                    }}
                >
                    <div style={{ position: 'absolute', width: '380px', height: '380px', background: 'rgba(255, 152, 57, 0.15)', filter: 'blur(80px)', borderRadius: '50%', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0 }} />
                    <img 
                        src="/mobile.png" 
                        alt="Meeting Illustration" 
                        style={{ 
                            width: '90%', 
                            maxWidth: '400px', 
                            height: 'auto', 
                            borderRadius: '24px', 
                            zIndex: 1, 
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                            transform: 'perspective(1000px) rotateY(-5deg) rotateX(5deg)',
                            transition: 'all 0.5s ease-in-out'
                        }} 
                        className="heroImage"
                    />
                </Box>
            </Box>

            {/* Connectly Security and Features Dialog */}
            <Dialog 
                open={securityOpen} 
                onClose={() => setSecurityOpen(false)}
                PaperProps={{
                    style: {
                        background: 'rgba(10, 13, 30, 0.95)',
                        backdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '24px',
                        color: 'white',
                        padding: '10px',
                        maxWidth: '650px'
                    }
                }}
            >
                <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px 24px 10px 24px' }}>
                    <ShieldIcon style={{ color: '#FF9839', fontSize: '2rem' }} />
                    <span style={{ fontWeight: 800, fontSize: '1.6rem', background: 'linear-gradient(135deg, #FFFFFF 30%, #FF9839 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Connectly Security & Project Insights
                    </span>
                </DialogTitle>

                <DialogContent style={{ padding: '0 24px 20px 24px' }}>
                    <Typography variant="body2" style={{ color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.6, marginBottom: '24px' }}>
                        Connectly is a premium, real-time video conferencing application designed to bring secure, low-latency audio/video streaming and interactive screen sharing directly to your web browser.
                    </Typography>

                    {/* Section 1: Security */}
                    <Box style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                        <ShieldIcon style={{ color: '#FF9839', marginTop: '4px' }} />
                        <div>
                            <Typography variant="subtitle1" style={{ fontWeight: 700, color: 'white' }}>
                                Secure WebRTC Connections
                            </Typography>
                            <Typography variant="body2" style={{ color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.5 }}>
                                Media tracks (audio/video/screen) are transmitted directly between peers using end-to-end encrypted WebRTC channels, ensuring your streams never pass through middle-man servers.
                            </Typography>
                        </div>
                    </Box>

                    {/* Section 2: Helpfulness */}
                    <Box style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                        <HelpOutlineIcon style={{ color: '#FF9839', marginTop: '4px' }} />
                        <div>
                            <Typography variant="subtitle1" style={{ fontWeight: 700, color: 'white' }}>
                                Zero Installation Convenience
                            </Typography>
                            <Typography variant="body2" style={{ color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.5 }}>
                                Start or join calls on any device natively in Chrome, Safari, or Firefox without downloading third-party plugins. Includes screen-sharing track swapping, dynamic grid auto-scaling, and persistent chat logs.
                            </Typography>
                        </div>
                    </Box>

                    {/* Section 3: Uniqueness */}
                    <Box style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                        <StarsIcon style={{ color: '#FF9839', marginTop: '4px' }} />
                        <div>
                            <Typography variant="subtitle1" style={{ fontWeight: 700, color: 'white' }}>
                                What Makes Connectly Unique
                            </Typography>
                            <Typography variant="body2" style={{ color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.5 }}>
                                Unlike other streaming systems that crash if cloud database links disconnect, Connectly features a <strong>hybrid data adapter</strong>. If MongoDB goes offline or firewalls block the cluster, the app seamlessly redirects logins and history to local file-based database adapters, keeping meetings fully operational.
                            </Typography>
                        </div>
                    </Box>
                </DialogContent>

                <DialogActions style={{ padding: '10px 24px 20px 24px', justifyContent: 'flex-end' }}>
                    <Button 
                        onClick={() => setSecurityOpen(false)}
                        style={{
                            background: 'linear-gradient(135deg, #FF9839 0%, #D97500 100%)',
                            color: 'white',
                            fontWeight: 700,
                            borderRadius: '10px',
                            textTransform: 'none',
                            padding: '8px 24px',
                            boxShadow: '0 4px 15px rgba(217, 117, 0, 0.3)'
                        }}
                    >
                        Got it, thanks!
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

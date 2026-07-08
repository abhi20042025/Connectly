import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Button, IconButton, Card, CardContent, Grid, Typography, Box, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import HistoryIcon from '@mui/icons-material/History';
import '../App.css';

export default function History() {
    const navigate = useNavigate();
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/auth");
            return;
        }

        const fetchHistory = async () => {
            try {
                const data = await getHistoryOfUser();
                // Ensure data is array and sort newest first
                if (Array.isArray(data)) {
                    const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
                    setMeetings(sorted);
                }
            } catch (err) {
                console.error("Failed to load history:", err);
                setError("Could not retrieve your meeting logs. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [navigate, getHistoryOfUser]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#030712', color: 'white', paddingBottom: '40px', position: 'relative', overflowX: 'hidden' }}>
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes float-blob-1 {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(60px, -80px) scale(1.15); }
                    66% { transform: translate(-40px, 30px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                @keyframes float-blob-2 {
                    0% { transform: translate(0px, 0px) scale(1); }
                    50% { transform: translate(-80px, 70px) scale(1.2); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                @keyframes float-blob-3 {
                    0% { transform: translate(0px, 0px) scale(1); }
                    40% { transform: translate(80px, 60px) scale(0.85); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .liquid-blob-1 {
                    position: absolute;
                    width: 500px;
                    height: 500px;
                    background: radial-gradient(circle, rgba(255, 152, 57, 0.22) 0%, rgba(255, 152, 57, 0) 70%);
                    filter: blur(80px);
                    animation: float-blob-1 16s infinite ease-in-out;
                    top: -10%;
                    left: -10%;
                    z-index: 0;
                }
                .liquid-blob-2 {
                    position: absolute;
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, rgba(156, 39, 176, 0.18) 0%, rgba(156, 39, 176, 0) 70%);
                    filter: blur(90px);
                    animation: float-blob-2 20s infinite ease-in-out;
                    bottom: -10%;
                    right: -10%;
                    z-index: 0;
                }
                .liquid-blob-3 {
                    position: absolute;
                    width: 450px;
                    height: 450px;
                    background: radial-gradient(circle, rgba(0, 210, 255, 0.18) 0%, rgba(0, 210, 255, 0) 70%);
                    filter: blur(75px);
                    animation: float-blob-3 14s infinite ease-in-out;
                    top: 25%;
                    left: 30%;
                    z-index: 0;
                }
            `}} />
            
            {/* Animated Background Blobs */}
            <div className="liquid-blob-1" />
            <div className="liquid-blob-2" />
            <div className="liquid-blob-3" />
            {/* Header */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '15px 40px', background: 'rgba(3, 7, 18, 0.5)', backdropFilter: 'blur(15px)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', zIndex: 10 }}>
                <IconButton 
                    onClick={() => navigate('/home')} 
                    style={{ color: 'white', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    sx={{ '&:hover': { background: 'rgba(255, 255, 255, 0.12)', transform: 'translateX(-2px)' } }}
                >
                    <ArrowBackIcon />
                </IconButton>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <HistoryIcon style={{ color: '#FF9839', fontSize: '2rem' }} />
                    <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 600, letterSpacing: '0.5px' }}>Meeting History</h2>
                </div>
            </nav>

            {/* Content Body */}
            <Box style={{ flex: 1, padding: '40px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                {loading ? (
                    <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: '20px' }}>
                        <CircularProgress style={{ color: '#FF9839' }} />
                        <Typography style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Fetching your logs...</Typography>
                    </Box>
                ) : error ? (
                    <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: '20px' }}>
                        <Typography color="error" variant="h6">{error}</Typography>
                        <Button variant="contained" onClick={() => window.location.reload()} style={{ background: '#FF9839', color: 'white', textTransform: 'none' }}>Retry</Button>
                    </Box>
                ) : meetings.length === 0 ? (
                    <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '20px', textAlign: 'center' }}>
                        <div style={{ background: 'rgba(255, 152, 57, 0.05)', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px dashed #FF9839' }}>
                            <VideoCallIcon style={{ color: '#FF9839', fontSize: '3rem' }} />
                        </div>
                        <Typography variant="h5" style={{ fontWeight: 600 }}>No meetings logged yet</Typography>
                        <Typography style={{ color: 'rgba(255, 255, 255, 0.5)', maxWidth: '400px' }}>
                            Any video conferences you create or join will be recorded here for quick access.
                        </Typography>
                        <Button 
                            variant="contained" 
                            onClick={() => navigate('/home')} 
                            style={{ 
                                background: 'linear-gradient(135deg, #FF9839 0%, #D97500 100%)', 
                                color: 'white', 
                                padding: '10px 24px', 
                                borderRadius: '10px',
                                textTransform: 'none',
                                fontWeight: '600',
                                boxShadow: '0 4px 15px rgba(217, 117, 0, 0.3)'
                            }}
                        >
                            Start a Meeting
                        </Button>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {meetings.map((meeting, index) => (
                            <Grid item xs={12} sm={6} md={4} key={meeting._id || index}>
                                <Card 
                                    style={{ 
                                        background: 'rgba(255, 255, 255, 0.02)', 
                                        backdropFilter: 'blur(25px)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '20px',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)',
                                        position: 'relative',
                                        zIndex: 5
                                    }}
                                    sx={{ 
                                        '&:hover': { 
                                            transform: 'translateY(-5px)', 
                                            borderColor: 'rgba(255, 152, 57, 0.4)', 
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            boxShadow: '0 12px 40px rgba(255, 152, 57, 0.1)'
                                        } 
                                    }}
                                >
                                    <CardContent style={{ padding: '24px' }}>
                                        <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF9839 0%, #D97500 100%)' }} />
                                                <Typography variant="subtitle2" style={{ color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                                                    Session
                                                </Typography>
                                            </div>
                                            <Button 
                                                size="small" 
                                                variant="text" 
                                                onClick={() => navigate(`/${meeting.meetingCode}`)}
                                                style={{ color: '#FF9839', fontWeight: 'bold', textTransform: 'none' }}
                                            >
                                                Rejoin
                                            </Button>
                                        </Box>
                                        
                                        <Typography variant="h5" style={{ fontWeight: 700, letterSpacing: '0.5px', marginBottom: '20px', fontFamily: 'monospace', color: '#FFFFFF' }}>
                                            {meeting.meetingCode}
                                        </Typography>

                                        <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <Box style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                <EventIcon style={{ fontSize: '1.1rem', color: '#FF9839' }} />
                                                <Typography variant="body2">{formatDate(meeting.date)}</Typography>
                                            </Box>
                                            <Box style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                <AccessTimeIcon style={{ fontSize: '1.1rem', color: '#FF9839' }} />
                                                <Typography variant="body2">{formatTime(meeting.date)}</Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>
        </div>
    );
}

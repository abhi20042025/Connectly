import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { AuthContext } from '../contexts/AuthContext';
import server from '../environment';
import { 
    Button, TextField, IconButton, Box, Typography, Card, 
    CardContent, Grid, Drawer, Tooltip, Avatar, Snackbar 
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import ChatIcon from '@mui/icons-material/Chat';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import SendIcon from '@mui/icons-material/Send';
import ClosedCaptionIcon from '@mui/icons-material/ClosedCaption';
import MinimizeIcon from '@mui/icons-material/Minimize';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import LanguageIcon from '@mui/icons-material/Language';
import PersonIcon from '@mui/icons-material/Person';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoodIcon from '@mui/icons-material/Mood';

export default function VideoMeetComponent() {
    const { url: meetingCode } = useParams();
    const navigate = useNavigate();
    const { userData } = useContext(AuthContext);

    // Join states
    const [joined, setJoined] = useState(false);
    const [displayName, setDisplayName] = useState('');
    
    // Audio/Video controls
    const [audioActive, setAudioActive] = useState(true);
    const [videoActive, setVideoActive] = useState(true);
    const [screenShareActive, setScreenShareActive] = useState(false);
    
    // Chat state
    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');

    // Stream and Peer states
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({}); // mapped by socketId -> stream
    const [remoteNames, setRemoteNames] = useState({}); // mapped by socketId -> name

    // Translate & Minimize & Captions states
    const [isMinimized, setIsMinimized] = useState(false);
    const [captionsActive, setCaptionsActive] = useState(false);
    const [targetLanguage, setTargetLanguage] = useState('hi');
    const [captionText, setCaptionText] = useState('');
    const [isTranslatingCaption, setIsTranslatingCaption] = useState(false);
    const recognitionRef = useRef(null);

    // Toast invitation & reactions & filters state
    const [toastOpen, setToastOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [floatingEmojis, setFloatingEmojis] = useState([]);
    const [showReactions, setShowReactions] = useState(false);
    const [cameraFilter, setCameraFilter] = useState('none');

    // Refs
    const localVideoRef = useRef(null);
    const socketRef = useRef(null);
    const peersRef = useRef({}); // socketId -> RTCPeerConnection
    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);

    // Initialize display name on load
    useEffect(() => {
        if (userData && userData.name) {
            setDisplayName(userData.name);
        } else {
            const token = localStorage.getItem("token");
            if (token) {
                setDisplayName("Connectly User");
            } else {
                setDisplayName("");
            }
        }
    }, [userData]);

    // Speech Recognition & Translation integration
    useEffect(() => {
        if (!joined) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition not supported in this browser.");
            return;
        }

        if (captionsActive) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = async (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0])
                    .map(result => result.transcript)
                    .join('');

                if (event.results[event.results.length - 1].isFinal) {
                    const finalPhrase = event.results[event.results.length - 1][0].transcript;
                    setIsTranslatingCaption(true);
                    try {
                        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(finalPhrase)}&langpair=en|${targetLanguage}`);
                        const resData = await response.json();
                        if (resData.responseData) {
                            setCaptionText(resData.responseData.translatedText);
                        }
                    } catch (err) {
                        console.error("Translation error:", err);
                        setCaptionText(finalPhrase);
                    }
                    setIsTranslatingCaption(false);
                } else {
                    setCaptionText(transcript);
                }
            };

            recognition.onerror = (err) => {
                console.error("Speech recognition error:", err);
            };

            recognition.onend = () => {
                if (captionsActive) {
                    try {
                        recognition.start();
                    } catch (e) {}
                }
            };

            recognitionRef.current = recognition;
            try {
                recognition.start();
            } catch (e) {}
        } else {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setCaptionText('');
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [captionsActive, joined, targetLanguage]);

    // Setup local camera/mic stream preview on lobby load
    useEffect(() => {
        const initLocalStream = async () => {
            let stream = null;
            
            // Tier 1: Ideal widescreen aspect ratio
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: "user"
                    },
                    audio: true
                });
                console.log("Tier 1 stream captured successfully.");
            } catch (err1) {
                console.warn("Tier 1 constraints failed, attempting Tier 2 standard resolution...", err1);
                
                // Tier 2: Standard resolution
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 640 },
                            height: { ideal: 480 }
                        },
                        audio: true
                    });
                    console.log("Tier 2 stream captured successfully.");
                } catch (err2) {
                    console.warn("Tier 2 constraints failed, attempting Tier 3 basic video...", err2);
                    
                    // Tier 3: Basic video & audio
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: true,
                            audio: true
                        });
                        console.log("Tier 3 stream captured successfully.");
                    } catch (err3) {
                        console.warn("Tier 3 constraints failed, attempting Tier 4 audio-only...", err3);
                        
                        // Tier 4: Audio-only fallback (no camera)
                        try {
                            stream = await navigator.mediaDevices.getUserMedia({
                                video: false,
                                audio: true
                            });
                            console.log("Tier 4 stream captured successfully (Audio Only).");
                        } catch (err4) {
                            console.error("All media capture attempts failed:", err4);
                        }
                    }
                }
            }

            if (stream) {
                setLocalStream(stream);
                localStreamRef.current = stream;
            }
        };

        if (!joined) {
            initLocalStream();
        }

        return () => {
            // Stop tracks only when the component unmounts
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Bind local stream to preview video once ref is available in DOM
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, joined, videoActive]);

    // Track state change handlers for audio/video preview
    const toggleAudioPreview = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setAudioActive(audioTrack.enabled);
            }
        }
    };

    const toggleVideoPreview = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setVideoActive(videoTrack.enabled);
            }
        }
    };

    // Join actual video call room
    const handleJoinCall = () => {
        if (!displayName.trim()) return;
        setJoined(true);
        initSocketAndWebrtc();
    };

    // Clean up connections on unmount/hangup
    const handleHangUp = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        
        // Stop screen share tracks if active
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
        }

        // Stop local media tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
        }

        // Close peer connections
        Object.values(peersRef.current).forEach(peerConnection => {
            peerConnection.close();
        });
        peersRef.current = {};

        setRemoteStreams({});
        setRemoteNames({});
        setJoined(false);
        navigate('/home');
    };

    // Establish WebSocket and configure Peer Connections
    const initSocketAndWebrtc = () => {
        const socket = io(server, {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Connected to Socket server with ID:", socket.id);
            socket.emit("join-call", meetingCode);
        });

        // Triggered when any user in room (including newcomer) is notified of participation
        socket.on("user-joined", (joinedSocketId, allClients) => {
            console.log("User joined room:", joinedSocketId);
            
            // If it is another user who joined, initiate connection
            if (joinedSocketId !== socket.id) {
                initiatePeerConnection(joinedSocketId);
            } else {
                // If it is us, we send our name to everyone else
                allClients.forEach(clientId => {
                    if (clientId !== socket.id) {
                        // Create connection structure if not exist
                        if (!peersRef.current[clientId]) {
                            createPeerConnectionObject(clientId);
                        }
                        // Send our display name
                        socket.emit("signal", clientId, { type: "name", name: displayName });
                    }
                });
            }
        });

        socket.on("signal", async (senderId, data) => {
            // Ensure connection object exists
            if (!peersRef.current[senderId]) {
                createPeerConnectionObject(senderId);
            }
            
            const pc = peersRef.current[senderId];

            if (data.type === "name") {
                setRemoteNames(prev => ({
                    ...prev,
                    [senderId]: data.name
                }));
                // Reply with our name as well
                socket.emit("signal", senderId, { type: "name", name: displayName });
            } else if (data.type === "offer") {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit("signal", senderId, {
                        type: "answer",
                        sdp: pc.localDescription
                    });
                } catch (err) {
                    console.error("Error setting offer or creating answer:", err);
                }
            } else if (data.type === "answer") {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                } catch (err) {
                    console.error("Error setting remote answer description:", err);
                }
            } else if (data.type === "ice-candidate") {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (err) {
                    console.error("Error adding ice candidate:", err);
                }
            }
        });

        socket.on("chat-message", (data, sender, senderSocketId) => {
            setMessages(prev => [...prev, {
                data,
                sender,
                socketId: senderSocketId,
                timestamp: new Date()
            }]);
        });

        socket.on("user-left", (leftSocketId) => {
            console.log("User disconnected:", leftSocketId);
            if (peersRef.current[leftSocketId]) {
                peersRef.current[leftSocketId].close();
                delete peersRef.current[leftSocketId];
            }
            setRemoteStreams(prev => {
                const copy = { ...prev };
                delete copy[leftSocketId];
                return copy;
            });
            setRemoteNames(prev => {
                const copy = { ...prev };
                delete copy[leftSocketId];
                return copy;
            });
        });

        socket.on("emoji-reaction", (emoji) => {
            const id = Date.now() + Math.random();
            const x = 30 + Math.random() * 40;
            setFloatingEmojis(prev => [...prev, { id, emoji, x }]);
            setTimeout(() => {
                setFloatingEmojis(prev => prev.filter(e => e.id !== id));
            }, 3000);
        });
    };

    // Helper: initialize Peer connection object
    const createPeerConnectionObject = (remoteId) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        });

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit("signal", remoteId, {
                    type: "ice-candidate",
                    candidate: event.candidate
                });
            }
        };

        // Handle remote stream tracks
        pc.ontrack = (event) => {
            console.log("Received remote track from:", remoteId, event.streams);
            setRemoteStreams(prev => ({
                ...prev,
                [remoteId]: event.streams[0]
            }));
        };

        // Add our local tracks
        const streamToShare = screenStreamRef.current || localStreamRef.current;
        if (streamToShare) {
            streamToShare.getTracks().forEach(track => {
                pc.addTrack(track, streamToShare);
            });
        }

        peersRef.current[remoteId] = pc;
        return pc;
    };

    // Helper: Initiate WebRTC negotiation (create Offer)
    const initiatePeerConnection = async (remoteId) => {
        const pc = createPeerConnectionObject(remoteId);
        try {
            // Share name immediately
            socketRef.current.emit("signal", remoteId, { type: "name", name: displayName });
            
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            socketRef.current.emit("signal", remoteId, {
                type: "offer",
                sdp: pc.localDescription
            });
        } catch (err) {
            console.error("Error initiating negotiation:", err);
        }
    };

    // Replace video track in current connections during screen-share toggles
    const replaceVideoTrack = (newTrack) => {
        Object.values(peersRef.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
                sender.replaceTrack(newTrack);
            }
        });
    };

    // Handle screen share initiation
    const toggleScreenShare = async () => {
        if (!screenShareActive) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenStreamRef.current = screenStream;
                const screenVideoTrack = screenStream.getVideoTracks()[0];

                // Replace outgoing track for all peers
                replaceVideoTrack(screenVideoTrack);

                // Update local preview
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream;
                }

                // Handle screen share stop via browser toolbar/panel
                screenVideoTrack.onended = () => {
                    stopScreenSharing(true);
                };

                setScreenShareActive(true);
            } catch (err) {
                console.error("Failed to share screen:", err);
            }
        } else {
            stopScreenSharing(false);
        }
    };

    const stopScreenSharing = (endedBySystem) => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
        }

        // Restore camera track
        if (localStreamRef.current) {
            const cameraVideoTrack = localStreamRef.current.getVideoTracks()[0];
            if (cameraVideoTrack) {
                replaceVideoTrack(cameraVideoTrack);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localStreamRef.current;
                }
            }
        }
        setScreenShareActive(false);
    };

    // Handle audio mute/unmute
    const handleToggleAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setAudioActive(audioTrack.enabled);
            }
        }
    };

    // Handle video play/pause
    const handleToggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setVideoActive(videoTrack.enabled);
            }
        }
    };

    const handleSendMessage = () => {
        if (!messageText.trim() || !socketRef.current) return;
        socketRef.current.emit("chat-message", messageText, displayName);
        setMessageText('');
    };

    // Copy meeting invite link to clipboard
    const handleCopyInviteLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setToastMessage("Invite link copied to clipboard!");
        setToastOpen(true);
    };

    // Send floating emoji reaction
    const handleSendEmoji = (emoji) => {
        const id = Date.now() + Math.random();
        const x = 30 + Math.random() * 40;
        setFloatingEmojis(prev => [...prev, { id, emoji, x }]);
        setTimeout(() => {
            setFloatingEmojis(prev => prev.filter(e => e.id !== id));
        }, 3000);
        
        if (socketRef.current) {
            socketRef.current.emit("emoji-reaction", emoji);
        }
        setShowReactions(false);
    };

    // Helper: auto-bind stream to dynamically rendered video tag, watch track state, analyze volume, and apply filters
    const VideoElement = ({ stream, isMuted = false, nameTag = 'Participant', filterType = 'none' }) => {
        const ref = useRef(null);
        const [videoEnabled, setVideoEnabled] = useState(true);
        const [isSpeaking, setIsSpeaking] = useState(false);

        // Audio Analyser for Active Speaker Highlighting
        useEffect(() => {
            if (!stream || stream.getAudioTracks().length === 0) {
                setIsSpeaking(false);
                return;
            }
            
            let audioContext;
            let source;
            let analyser;
            let interval;
            
            try {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                audioContext = new AudioContextClass();
                source = audioContext.createMediaStreamSource(stream);
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                
                interval = setInterval(() => {
                    if (analyser) {
                        analyser.getByteFrequencyData(dataArray);
                        let total = 0;
                        for (let i = 0; i < bufferLength; i++) {
                            total += dataArray[i];
                        }
                        const average = total / bufferLength;
                        setIsSpeaking(average > 10);
                    }
                }, 200);
            } catch (e) {
                console.warn("Audio Context init blocked or failed:", e.message);
            }
            
            return () => {
                clearInterval(interval);
                try {
                    if (source) source.disconnect();
                    if (audioContext) audioContext.close();
                } catch (err) {}
            };
        }, [stream]);

        useEffect(() => {
            if (ref.current && stream) {
                ref.current.srcObject = stream;
                
                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack) {
                    setVideoEnabled(videoTrack.enabled);
                    const handleTrackChange = () => {
                        setVideoEnabled(videoTrack.enabled);
                    };
                    videoTrack.addEventListener('mute', handleTrackChange);
                    videoTrack.addEventListener('unmute', handleTrackChange);
                    
                    const interval = setInterval(() => {
                        if (videoTrack) {
                            setVideoEnabled(videoTrack.enabled && videoTrack.readyState === 'live');
                        }
                    }, 400);

                    return () => {
                        videoTrack.removeEventListener('mute', handleTrackChange);
                        videoTrack.removeEventListener('unmute', handleTrackChange);
                        clearInterval(interval);
                    };
                } else {
                    setVideoEnabled(false);
                }
            } else {
                setVideoEnabled(false);
            }
        }, [stream]);

        // Dynamic border glow styling when speaking
        const borderGlowStyle = isSpeaking ? {
            border: '2.5px solid #FF9839',
            boxShadow: '0 0 25px rgba(255, 152, 57, 0.75)',
            transform: 'scale(1.02)'
        } : {
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            transform: 'scale(1)'
        };

        // Custom visual studio filters mapping
        const filterStyle = filterType === 'warm' ? 'saturate(1.35) sepia(0.12)' 
                          : filterType === 'cool' ? 'contrast(1.08) hue-rotate(12deg) saturate(0.92)' 
                          : filterType === 'mono' ? 'grayscale(1) contrast(1.25)' 
                          : filterType === 'vintage' ? 'sepia(0.72) contrast(0.9)' 
                          : 'none';

        return (
            <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '16px', overflow: 'hidden', background: '#0a0d1d', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', ...borderGlowStyle }}>
                {videoEnabled ? (
                    <video 
                        ref={ref} 
                        autoPlay 
                        playsInline 
                        muted={isMuted} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', filter: filterStyle }} 
                    />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <Avatar style={{ background: 'linear-gradient(135deg, #FF9839 0%, #D97500 100%)', width: '60px', height: '60px', fontSize: '1.5rem', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(217, 117, 0, 0.3)' }}>
                            {nameTag.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" style={{ color: 'rgba(255,255,255,0.4)' }}>Camera Off</Typography>
                    </div>
                )}
                
                {/* Audio Equalizer visualizer */}
                {isSpeaking && (
                    <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px', width: '15px', background: 'rgba(0, 0, 0, 0.6)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(255, 152, 57, 0.3)', backdropFilter: 'blur(5px)', zIndex: 10 }}>
                        <style dangerouslySetInnerHTML={{__html: `
                            @keyframes eqBounce {
                                0%, 100% { height: 3px; }
                                50% { height: 14px; }
                            }
                            .eq-bar { width: 2.5px; background: #FF9839; animation: eqBounce 0.8s ease-in-out infinite; }
                            .eq-bar-1 { animation-delay: 0.1s; }
                            .eq-bar-2 { animation-delay: 0.35s; }
                            .eq-bar-3 { animation-delay: 0.2s; }
                        `}} />
                        <div className="eq-bar eq-bar-1" />
                        <div className="eq-bar eq-bar-2" />
                        <div className="eq-bar eq-bar-3" />
                    </div>
                )}

                <div style={{ position: 'absolute', bottom: '15px', left: '15px', background: 'rgba(0, 0, 0, 0.6)', padding: '6px 14px', borderRadius: '8px', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <PersonIcon style={{ color: '#FF9839', fontSize: '1.1rem' }} />
                    <Typography variant="body2" style={{ fontWeight: 600, color: 'white' }}>{nameTag}</Typography>
                </div>
            </div>
        );
    };

    // Render Lobby Screen before Joining
    if (!joined) {
        return (
            <div className="page-transition" style={{ display: 'flex', minHeight: '100vh', background: 'radial-gradient(circle at 10% 20%, rgb(4, 12, 34) 0%, rgb(1, 4, 16) 90%)', color: 'white', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <Card style={{ width: '100%', maxWidth: '900px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                    <CardContent style={{ padding: '40px' }}>
                        <Grid container spacing={4} alignItems="center">
                            {/* Left Side: Video Preview */}
                            <Grid item xs={12} md={7}>
                                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/10', background: '#0a0d1d', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {videoActive && localStream ? (
                                        <video 
                                            ref={localVideoRef} 
                                            autoPlay 
                                            playsInline 
                                            muted 
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scaleX(-1)' }} 
                                        />
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <VideocamOffIcon style={{ color: 'rgba(255,255,255,0.4)', fontSize: '2.5rem' }} />
                                            </div>
                                            <Typography variant="body2" style={{ color: 'rgba(255,255,255,0.4)' }}>Camera is turned off</Typography>
                                        </div>
                                    )}
                                    
                                    {/* Quick Preview Control Buttons */}
                                    <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '15px', zIndex: 2 }}>
                                        <IconButton 
                                            onClick={toggleAudioPreview} 
                                            style={{ 
                                                background: audioActive ? 'rgba(255,255,255,0.15)' : '#d32f2f', 
                                                color: 'white',
                                                border: '1px solid rgba(255,255,255,0.25)',
                                                backdropFilter: 'blur(5px)',
                                                padding: '12px'
                                            }}
                                            sx={{ '&:hover': { transform: 'scale(1.1)', background: audioActive ? 'rgba(255,255,255,0.25)' : '#b71c1c' } }}
                                        >
                                            {audioActive ? <MicIcon /> : <MicOffIcon />}
                                        </IconButton>
                                        <IconButton 
                                            onClick={toggleVideoPreview} 
                                            style={{ 
                                                background: videoActive ? 'rgba(255,255,255,0.15)' : '#d32f2f', 
                                                color: 'white',
                                                border: '1px solid rgba(255,255,255,0.25)',
                                                backdropFilter: 'blur(5px)',
                                                padding: '12px'
                                            }}
                                            sx={{ '&:hover': { transform: 'scale(1.1)', background: videoActive ? 'rgba(255,255,255,0.25)' : '#b71c1c' } }}
                                        >
                                            {videoActive ? <VideocamIcon /> : <VideocamOffIcon />}
                                        </IconButton>
                                    </div>
                                </div>
                            </Grid>
                            
                            {/* Right Side: Configuration & Join */}
                            <Grid item xs={12} md={5} style={{ display: 'flex', flexDirection: 'column', gap: '25px', textAlign: 'left' }}>
                                <div>
                                    <Typography variant="h4" style={{ fontWeight: 800, color: 'white', marginBottom: '8px' }}>Ready to join?</Typography>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Typography variant="body2" style={{ color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>Meeting Code: <strong style={{ color: '#FF9839', fontFamily: 'monospace' }}>{meetingCode}</strong></Typography>
                                        <Tooltip title="Copy Invite Link">
                                            <IconButton onClick={handleCopyInviteLink} style={{ color: '#FF9839', padding: '4px' }}>
                                                <ContentCopyIcon style={{ fontSize: '1rem' }} />
                                            </IconButton>
                                        </Tooltip>
                                    </div>
                                </div>

                                <TextField
                                    label="Your display name"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Enter your name to join"
                                    InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }}
                                    InputProps={{
                                        style: {
                                            color: 'white',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: '12px',
                                            borderColor: 'rgba(255,255,255,0.1)'
                                        }
                                    }}
                                    sx={{
                                        '& label.Mui-focused': { color: '#FF9839' },
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
                                            '&.Mui-focused fieldset': { borderColor: '#FF9839' },
                                        }
                                    }}
                                    fullWidth
                                />

                                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                    <Button
                                        variant="contained"
                                        onClick={handleJoinCall}
                                        disabled={!displayName.trim()}
                                        style={{
                                            background: displayName.trim() ? 'linear-gradient(135deg, #FF9839 0%, #D97500 100%)' : 'rgba(255,255,255,0.05)',
                                            color: displayName.trim() ? 'white' : 'rgba(255,255,255,0.3)',
                                            padding: '14px 28px',
                                            borderRadius: '12px',
                                            fontWeight: 700,
                                            flex: 2,
                                            textTransform: 'none',
                                            boxShadow: displayName.trim() ? '0 8px 25px rgba(217, 117, 0, 0.3)' : 'none'
                                        }}
                                    >
                                        Join Meeting
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => navigate('/home')}
                                        style={{
                                            borderColor: 'rgba(255,255,255,0.2)',
                                            color: 'white',
                                            padding: '14px',
                                            borderRadius: '12px',
                                            fontWeight: 600,
                                            flex: 1,
                                            textTransform: 'none'
                                        }}
                                        sx={{ '&:hover': { borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' } }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Dynamic Video Grid Sizing Math
    const remoteActiveCount = Object.keys(remoteStreams).length;
    const totalStreams = 1 + remoteActiveCount;
    
    // Grid item widths & heights mapping for responsiveness
    const gridWidths = totalStreams === 1 
        ? { xs: 12 } 
        : totalStreams === 2 
            ? { xs: 12, sm: 6 } 
            : totalStreams <= 4 
                ? { xs: 6 } 
                : { xs: 6, sm: 4 };

    const gridHeights = totalStreams === 1 
        ? '75vh' 
        : totalStreams === 2 
            ? { xs: '38vh', sm: '75vh' } 
            : totalStreams <= 4 
                ? { xs: '22vh', sm: '42vh' } 
                : { xs: '22vh', sm: '30vh' };


    return (
        <div 
            className="page-transition" 
            style={isMinimized ? {
                position: 'fixed',
                bottom: '30px',
                right: '30px',
                width: '380px',
                height: '280px',
                borderRadius: '24px',
                border: '2px solid rgba(255, 152, 57, 0.4)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.75)',
                zIndex: 9999,
                overflow: 'hidden',
                background: '#070913',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            } : {
                display: 'flex',
                height: '100vh',
                width: '100vw',
                background: '#070913',
                overflow: 'hidden',
                position: 'relative',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
        >
            {/* Minimized PiP mode background dashboard simulation */}
            {isMinimized && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1, pointerEvents: 'auto', background: '#030712', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                    <LanguageIcon style={{ color: '#FF9839', fontSize: '4.5rem' }} />
                    <Typography variant="h5" style={{ fontWeight: 700, color: 'white' }}>Meeting Active (PiP Mode)</Typography>
                    <Typography style={{ color: 'rgba(255, 255, 255, 0.5)', maxWidth: '450px', textAlign: 'center' }}>
                        Your video conference is active in the minimized card in the bottom-right corner. You can multitask or continue browsing freely.
                    </Typography>
                    <Button 
                        variant="contained" 
                        onClick={() => setIsMinimized(false)} 
                        style={{ 
                            background: 'linear-gradient(135deg, #FF9839 0%, #D97500 100%)', 
                            color: 'white', 
                            textTransform: 'none', 
                            fontWeight: 600,
                            borderRadius: '10px',
                            padding: '10px 24px',
                            boxShadow: '0 4px 15px rgba(217, 117, 0, 0.3)'
                        }}
                    >
                        Maximize Meeting View
                    </Button>
                </div>
            )}
            {/* Left/Middle Video Meeting Room Grid */}
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', transition: 'margin-right 0.3s ease' }}>
                
                {/* Meeting Header */}
                <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(7, 9, 19, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '10px 20px', borderRadius: '12px' }}>
                    <div style={{ background: '#FF9839', width: '10px', height: '10px', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                    <Typography variant="subtitle2" style={{ fontWeight: 700, letterSpacing: '0.5px' }}>
                        Live Meet: <span style={{ fontFamily: 'monospace', color: '#FF9839', marginLeft: '5px' }}>{meetingCode}</span>
                    </Typography>
                </div>

                {/* Minimized Header Maximize Button */}
                {isMinimized && (
                    <Box style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 200 }}>
                        <Tooltip title="Maximize Call">
                            <IconButton 
                                onClick={() => setIsMinimized(false)}
                                style={{ background: 'rgba(255, 152, 57, 0.95)', color: 'white', padding: '8px' }}
                            >
                                <FullscreenIcon style={{ fontSize: '1.4rem' }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}

                {/* Video Streams Container */}
                <Box sx={{ flex: 1, padding: { xs: '60px 15px 145px 15px', md: '80px 40px 110px 40px' }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Grid container spacing={2} style={{ width: '100%', height: '100%', alignContent: 'center', justifyContent: 'center' }}>
                        {/* 1. Local Video stream */}
                        <Grid item {...gridWidths} sx={{ height: gridHeights, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <VideoElement 
                                stream={localStream} 
                                isMuted={true} 
                                nameTag={`${displayName} (You)`} 
                                filterType={cameraFilter}
                            />
                        </Grid>

                        {/* 2. Remote streams */}
                        {Object.entries(remoteStreams).map(([socketId, stream]) => (
                            <Grid item {...gridWidths} key={socketId} sx={{ height: gridHeights, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <VideoElement 
                                    stream={stream} 
                                    isMuted={false} 
                                    nameTag={remoteNames[socketId] || `Peer (${socketId.slice(0, 4)})`} 
                                />
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* Live Captions Subtitles Panel */}
                {captionsActive && captionText && (
                    <Box style={{
                        position: 'absolute',
                        bottom: isMinimized ? '70px' : '105px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(7, 9, 19, 0.85)',
                        backdropFilter: 'blur(15px)',
                        border: '1px solid rgba(255, 152, 57, 0.3)',
                        padding: isMinimized ? '6px 12px' : '12px 24px',
                        borderRadius: '16px',
                        color: 'white',
                        maxWidth: '85%',
                        textAlign: 'center',
                        boxShadow: '0 8px 32px rgba(255, 152, 57, 0.15)',
                        zIndex: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <Typography variant="caption" style={{ color: '#FF9839', fontWeight: 600, letterSpacing: '0.5px', fontSize: isMinimized ? '0.65rem' : '0.75rem' }}>
                            {isTranslatingCaption ? "Translating Video (Revolving)..." : "Translated Subtitles"}
                        </Typography>
                        <Typography variant="body1" style={{ fontWeight: 500, textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontSize: isMinimized ? '0.8rem' : '1rem' }}>
                            {captionText}
                        </Typography>
                    </Box>
                )}

                {/* Video Controls Footer Bar */}
                <Box sx={{ 
                    position: 'absolute', 
                    bottom: { xs: '15px', md: '25px' }, 
                    left: '50%', 
                    transform: 'translateX(-50%)', 
                    display: 'flex', 
                    gap: { xs: '8px', sm: '15px', md: '20px' }, 
                    zIndex: 10, 
                    background: 'rgba(7, 9, 19, 0.65)', 
                    backdropFilter: 'blur(15px)', 
                    border: '1px solid rgba(255, 255, 255, 0.08)', 
                    padding: { xs: '8px 12px', sm: '10px 20px', md: '12px 30px' }, 
                    borderRadius: '20px', 
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: { xs: '92%', sm: 'max-content' },
                    maxWidth: '95%'
                }}>
                    {/* Toggle Microphone */}
                    <Tooltip title={audioActive ? "Mute Microphone" : "Unmute Microphone"}>
                        <IconButton 
                            onClick={handleToggleAudio}
                            style={{ background: audioActive ? 'rgba(255,255,255,0.06)' : '#d32f2f', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '12px' }}
                            sx={{ '&:hover': { transform: 'translateY(-2px)', background: audioActive ? 'rgba(255,255,255,0.12)' : '#b71c1c' } }}
                        >
                            {audioActive ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>
                    </Tooltip>

                    {/* Toggle Camera */}
                    <Tooltip title={videoActive ? "Turn Off Camera" : "Turn On Camera"}>
                        <IconButton 
                            onClick={handleToggleVideo}
                            style={{ background: videoActive ? 'rgba(255,255,255,0.06)' : '#d32f2f', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '12px' }}
                            sx={{ '&:hover': { transform: 'translateY(-2px)', background: videoActive ? 'rgba(255,255,255,0.12)' : '#b71c1c' } }}
                        >
                            {videoActive ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                    </Tooltip>

                    {/* Toggle Screen Share */}
                    <Tooltip title={screenShareActive ? "Stop Sharing Screen" : "Share Screen"}>
                        <IconButton 
                            onClick={toggleScreenShare}
                            style={{ background: screenShareActive ? '#FF9839' : 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '12px' }}
                            sx={{ '&:hover': { transform: 'translateY(-2px)', background: screenShareActive ? '#e57d17' : 'rgba(255,255,255,0.12)' } }}
                        >
                            {screenShareActive ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                        </IconButton>
                    </Tooltip>

                    {/* Toggle Chat Room */}
                    <Tooltip title="Toggle Chat Panel">
                        <IconButton 
                            onClick={() => setChatOpen(!chatOpen)}
                            style={{ background: chatOpen ? '#FF9839' : 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '12px' }}
                            sx={{ '&:hover': { transform: 'translateY(-2px)', background: chatOpen ? '#e57d17' : 'rgba(255,255,255,0.12)' } }}
                        >
                            <ChatIcon />
                        </IconButton>
                    </Tooltip>

                    {/* Toggle Live Captions / Translate */}
                    <Tooltip title="Translate & Live Subtitles">
                        <IconButton 
                            onClick={() => setCaptionsActive(!captionsActive)}
                            style={{ background: captionsActive ? '#FF9839' : 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '12px' }}
                            sx={{ '&:hover': { transform: 'translateY(-2px)', background: captionsActive ? '#e57d17' : 'rgba(255,255,255,0.12)' } }}
                        >
                            <ClosedCaptionIcon />
                        </IconButton>
                    </Tooltip>

                    {/* Target Language Selector */}
                    {captionsActive && (
                        <select 
                            value={targetLanguage} 
                            onChange={(e) => setTargetLanguage(e.target.value)}
                            style={{
                                background: 'rgba(7, 9, 19, 0.95)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.85rem',
                                outline: 'none',
                                cursor: 'pointer',
                                height: '40px',
                                alignSelf: 'center'
                            }}
                        >
                            <option value="hi">Hindi (हिन्दी)</option>
                            <option value="es">Spanish (Español)</option>
                            <option value="fr">French (Français)</option>
                            <option value="de">German (Deutsch)</option>
                            <option value="zh">Chinese (中文)</option>
                            <option value="en">English (Original)</option>
                        </select>
                    )}

                    {/* Toggle Reactions */}
                    <Tooltip title="Send Reaction">
                        <IconButton 
                            onClick={() => setShowReactions(!showReactions)}
                            style={{ background: showReactions ? '#FF9839' : 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '12px' }}
                            sx={{ '&:hover': { transform: 'translateY(-2px)', background: showReactions ? '#e57d17' : 'rgba(255,255,255,0.12)' } }}
                        >
                            <MoodIcon />
                        </IconButton>
                    </Tooltip>

                    {/* Emoji Picker Popover */}
                    {showReactions && (
                        <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(7, 9, 19, 0.95)', border: '1px solid rgba(255, 152, 57, 0.3)', backdropFilter: 'blur(15px)', borderRadius: '15px', padding: '10px 15px', display: 'flex', gap: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 1000 }}>
                            {['👍', '❤️', '🎉', '👏', '😂', '😮'].map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => handleSendEmoji(emoji)}
                                    style={{ background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', transition: 'transform 0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.25)'}
                                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Studio Camera Filter Select */}
                    <Tooltip title="Studio Filters">
                        <select 
                            value={cameraFilter} 
                            onChange={(e) => setCameraFilter(e.target.value)}
                            style={{
                                background: 'rgba(7, 9, 19, 0.95)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.85rem',
                                outline: 'none',
                                cursor: 'pointer',
                                height: '40px',
                                alignSelf: 'center',
                                borderLeft: '3px solid #FF9839'
                            }}
                        >
                            <option value="none">✨ Normal Filter</option>
                            <option value="warm">🎬 Cinematic Warm</option>
                            <option value="cool">❄️ Cool Studio</option>
                            <option value="mono">📓 Classic B&W</option>
                            <option value="vintage">⏳ Sepia Vintage</option>
                        </select>
                    </Tooltip>

                    {/* Copy Invite Link Button */}
                    <Tooltip title="Copy Invite Link">
                        <IconButton 
                            onClick={handleCopyInviteLink}
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '12px' }}
                            sx={{ '&:hover': { transform: 'translateY(-2px)', background: 'rgba(255,255,255,0.12)' } }}
                        >
                            <ContentCopyIcon />
                        </IconButton>
                    </Tooltip>

                    {/* Toggle Minimize / PiP */}
                    {!isMinimized && (
                        <Tooltip title="Minimize Call">
                            <IconButton 
                                onClick={() => setIsMinimized(true)}
                                style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '12px' }}
                                sx={{ '&:hover': { transform: 'translateY(-2px)', background: 'rgba(255,255,255,0.12)' } }}
                            >
                                <MinimizeIcon />
                            </IconButton>
                        </Tooltip>
                    )}

                    {/* Divider line */}
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.15)', margin: '0 5px' }} />

                    {/* End Call/Leave Meeting */}
                    <Tooltip title="Leave Meeting">
                        <IconButton 
                            onClick={handleHangUp}
                            style={{ background: '#d32f2f', color: 'white', padding: '12px' }}
                            sx={{ '&:hover': { transform: 'scale(1.1)', background: '#b71c1c' } }}
                        >
                            <CallEndIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Right Chat Drawer Sidebar */}
            <Drawer
                anchor="right"
                open={chatOpen}
                onClose={() => setChatOpen(false)}
                variant="persistent"
                sx={{
                    '& .MuiDrawer-paper': {
                        width: { xs: '100%', sm: '380px' },
                        background: 'rgba(10, 13, 29, 0.95)',
                        backdropFilter: 'blur(20px)',
                        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                        color: 'white',
                        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
                    }
                }}
            >
                <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Chat Header */}
                    <Box style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <Typography variant="h6" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ChatIcon style={{ color: '#FF9839' }} /> In-Call Chat
                        </Typography>
                        <IconButton onClick={() => setChatOpen(false)} style={{ color: 'rgba(255,255,255,0.5)' }}>
                            &times;
                        </IconButton>
                    </Box>

                    {/* Chat Messages Log list */}
                    <Box style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {messages.length === 0 ? (
                            <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4, textAlign: 'center', gap: '10px', padding: '20px' }}>
                                <ChatIcon style={{ fontSize: '2.5rem' }} />
                                <Typography variant="body2">Messages sent here are visible to everyone in the meeting room.</Typography>
                            </Box>
                        ) : (
                            messages.map((msg, i) => {
                                const isSelf = msg.socketId === socketRef.current?.id;
                                return (
                                    <Box 
                                        key={i} 
                                        style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: isSelf ? 'flex-end' : 'flex-start',
                                            width: '100%'
                                        }}
                                    >
                                        <Typography variant="caption" style={{ color: 'rgba(255, 255, 255, 0.4)', marginBottom: '4px', paddingLeft: '4px' }}>
                                            {isSelf ? 'You' : msg.sender}
                                        </Typography>
                                        <div 
                                            style={{ 
                                                background: isSelf ? 'linear-gradient(135deg, #FF9839 0%, #D97500 100%)' : 'rgba(255, 255, 255, 0.08)',
                                                color: 'white',
                                                padding: '10px 16px',
                                                borderRadius: isSelf ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                                                maxWidth: '85%',
                                                wordBreak: 'break-word',
                                                boxShadow: isSelf ? '0 4px 15px rgba(217, 117, 0, 0.2)' : 'none'
                                            }}
                                        >
                                            <Typography variant="body2" style={{ lineHeight: 1.4 }}>{msg.data}</Typography>
                                        </div>
                                    </Box>
                                );
                            })
                        )}
                    </Box>

                    {/* Chat Text Input Send Bar */}
                    <Box style={{ padding: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(7, 9, 19, 0.4)' }}>
                        <Box style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <TextField
                                placeholder="Send a message..."
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                fullWidth
                                variant="outlined"
                                InputProps={{
                                    style: {
                                        color: 'white',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        borderRadius: '12px',
                                    }
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                        '&.Mui-focused fieldset': { borderColor: '#FF9839' }
                                    },
                                    '& .MuiInputBase-input': { padding: '12px 14px' }
                                }}
                            />
                            <IconButton 
                                onClick={handleSendMessage}
                                disabled={!messageText.trim()}
                                style={{ 
                                    background: messageText.trim() ? '#FF9839' : 'rgba(255,255,255,0.03)', 
                                    color: 'white',
                                    padding: '12px'
                                }}
                                sx={{ '&:hover': { background: '#e57d17', transform: 'scale(1.05)' } }}
                            >
                                <SendIcon style={{ fontSize: '1.1rem' }} />
                            </IconButton>
                        </Box>
                    </Box>
                </Box>
            </Drawer>
            {/* Floating Emojis Overlay */}
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 99999, overflow: 'hidden' }}>
                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes emojiFloat {
                        0% { transform: translateY(100vh) scale(0.6); opacity: 1; }
                        50% { transform: translateY(50vh) scale(1.3) rotate(15deg); opacity: 0.9; }
                        100% { transform: translateY(-10vh) scale(1.8) rotate(-15deg); opacity: 0; }
                    }
                    .floating-emoji {
                        position: absolute;
                        bottom: 0;
                        font-size: 2.8rem;
                        animation: emojiFloat 3s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
                    }
                `}} />
                {floatingEmojis.map(item => (
                    <span 
                        key={item.id} 
                        className="floating-emoji" 
                        style={{ left: `${item.x}%` }}
                    >
                        {item.emoji}
                    </span>
                ))}
            </div>

            {/* Invite Clipboard Copy Toast Notification */}
            <Snackbar 
                open={toastOpen} 
                autoHideDuration={3000} 
                onClose={() => setToastOpen(false)}
                message={toastMessage}
                ContentProps={{
                    style: {
                        background: 'rgba(7, 9, 19, 0.95)',
                        backdropFilter: 'blur(15px)',
                        border: '1px solid rgba(255, 152, 57, 0.4)',
                        borderRadius: '12px',
                        color: 'white',
                        fontWeight: 600,
                        boxShadow: '0 8px 32px rgba(255, 152, 57, 0.15)'
                    }
                }}
            />
        </div>
    );
}

// Inline animation definition for pulsating red dot
const animationStyles = `
    @keyframes pulse {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 152, 57, 0.7); }
        70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 152, 57, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 152, 57, 0); }
    }
`;
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = animationStyles;
    document.head.appendChild(styleSheet);
}

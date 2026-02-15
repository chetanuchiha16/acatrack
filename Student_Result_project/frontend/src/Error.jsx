import React from 'react';

const Error = () => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f8d7da',
        // background:'white',
        color: '#721c24'
    }}>
        <h1 style={{ fontSize: '4rem', margin: 0 ,fontWeight:'bold'}}>404</h1>
        <h2 style={{ margin: '1rem 0' }}>Page Not Found</h2>
        <p  style={{ fontSize: '1rem'}}>Sorry, the page you are looking for does not exist.</p>
        <a href="/" style={{
            marginTop: '1.5rem',
            padding: '0.5rem 1.5rem',
            background: '#721c24',
            color: '#fff',
        
            borderRadius: '4px',
            textDecoration: 'none'
        }}>
            Go Home
        </a>
    </div>
);

export default Error;
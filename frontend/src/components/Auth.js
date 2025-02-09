import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
const LoginForm = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Login successful! Redirecting...');
        localStorage.setItem('token', data.token);
        localStorage.setItem('is_admin', data.isAdmin);
        
        // Decode token to verify admin status
        const decodedToken = JSON.parse(atob(data.token.split('.')[1]));
        
        setTimeout(() => {
          if (decodedToken.is_admin) {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }, 2000);
      } else {
        setErrorMessage(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setErrorMessage('An error occurred. Please try again.');
    }
  };

  

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Login</h2>
      {errorMessage && (
        <div className="mb-4 p-2 bg-red-100 text-red-600 border border-red-200 rounded">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-2 bg-green-100 text-green-600 border border-green-200 rounded">
          {successMessage}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            className="w-full p-2 border rounded"
            value={credentials.email}
            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            className="w-full p-2 border rounded"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Login
        </button>
      </form>
    </div>
  );
};

const SignupForm = () => {
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Basic validation
    if (!userData.name || !userData.email || !userData.password || !userData.confirmPassword) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    if (userData.password !== userData.confirmPassword) {
      setErrorMessage("Passwords don't match!");
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          password: userData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Signup successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000); // Redirect after 2 seconds
      } else {
        setErrorMessage(data.error || 'Signup failed. Please try again.');
      }
    } catch (error) {
      console.error('Signup failed:', error);
      setErrorMessage('An error occurred. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Sign Up</h2>
      {errorMessage && (
        <div className="mb-4 p-2 bg-red-100 text-red-600 border border-red-200 rounded">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-2 bg-green-100 text-green-600 border border-green-200 rounded">
          {successMessage}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Name</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={userData.name}
            onChange={(e) => setUserData({ ...userData, name: e.target.value })}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            className="w-full p-2 border rounded"
            value={userData.email}
            onChange={(e) => setUserData({ ...userData, email: e.target.value })}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            className="w-full p-2 border rounded"
            value={userData.password}
            onChange={(e) => setUserData({ ...userData, password: e.target.value })}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Confirm Password</label>
          <input
            type="password"
            className="w-full p-2 border rounded"
            value={userData.confirmPassword}
            onChange={(e) => setUserData({ ...userData, confirmPassword: e.target.value })}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Sign Up
        </button>
      </form>
    </div>
  );
};

export { LoginForm, SignupForm };


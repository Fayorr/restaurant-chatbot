import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export default function ChatBox() {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [deviceId, setDeviceId] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const messagesEndRef = useRef(null);
	const hasVerified = useRef(false);

	const verifyPayment = async (reference) => {
		setIsLoading(true);
		try {
			const res = await axios.get(`/api/payment/verify/${reference}`);

			setMessages((prev) => [
				...prev,
				{
					sender: 'bot',
					text: `✅ ${res.data.message}\n\nSelect 1 to place a new order\nSelect 0 for main menu`,
				},
			]);

			window.history.replaceState({}, document.title, '/');
		} catch (error) {
			console.error(error);
			setMessages((prev) => [
				...prev,
				{
					sender: 'bot',
					text: '❌ Payment verification failed. Please check with support.',
				},
			]);
		} finally {
			setIsLoading(false);
		}
	};

	// Initialize session and get the first greeting
useEffect(() => {
	let id = localStorage.getItem('chatbot_device_id');
	if (!id) {
		id = uuidv4();
		localStorage.setItem('chatbot_device_id', id);
	}
	setDeviceId(id);

	const urlParams = new URLSearchParams(window.location.search);
	const reference = urlParams.get('reference');

	// Use the ref to ensure this only runs ONCE, even in React StrictMode
	if (reference && !hasVerified.current) {
		hasVerified.current = true;
		verifyPayment(reference);
	} else if (!reference && messages.length === 0) {
		sendMessage('', id);
	}
}, []);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);



	const sendMessage = async (text, id = deviceId) => {
		if (text) {
			setMessages((prev) => [...prev, { sender: 'user', text }]);
		}
		setIsLoading(true);
		try {
			// In production, update this to your full backend URL if not using a proxy
			const res = await axios.post('/api/chat/message', {
				deviceId: id,
				message: text,
			});
			setMessages((prev) => [...prev, { sender: 'bot', text: res.data.reply }]);
		} catch (error) {
			setMessages((prev) => [
				...prev,
				{ sender: 'bot', text: 'Network error. Please try again.' },
			]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSend = () => {
		if (!input.trim()) return;
		const msg = input;
		setInput('');
		sendMessage(msg);
	};

	// Utility to parse URLs in text and make them clickable (for Paystack links)
	const renderText = (text) => {
		const urlRegex = /(https?:\/\/[^\s]+)/g;
		return text.split('\n').map((line, i) => (
			<span key={i}>
				{line.split(urlRegex).map((part, j) =>
					urlRegex.test(part) ? (
						<a
							key={j}
							href={part}
							target='_blank'
							rel='noopener noreferrer'
							className='text-blue-800 underline font-semibold'
						>
							{part}
						</a>
					) : (
						part
					),
				)}
				<br />
			</span>
		));
	};

	return (
		<div className='flex flex-col h-[80vh] max-w-md mx-auto bg-gray-50 border shadow-2xl rounded-lg overflow-hidden'>
			<div className='bg-green-700 text-white p-4 font-bold text-xl text-center shadow-sm'>
			Restaurant Order Bot
			</div>

			<div className='flex-1 p-4 overflow-y-auto'>
				{messages.map((m, idx) => (
					<div
						key={idx}
						className={`mb-4 flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
					>
						<div
							className={`p-3 rounded-lg max-w-[85%] whitespace-pre-wrap text-sm ${m.sender === 'user' ? 'bg-green-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-none'}`}
						>
							{renderText(m.text)}
						</div>
					</div>
				))}
				{isLoading && (
					<div className='text-left text-gray-400 text-sm ml-2 italic'>
						Bot is typing...
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			<div className='p-4 bg-white border-t flex gap-2'>
				<input
					type='text'
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyPress={(e) => e.key === 'Enter' && handleSend()}
					className='flex-1 border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-green-500 transition-colors'
					placeholder='Reply with an option...'
					disabled={isLoading}
				/>
				<button
					onClick={handleSend}
					disabled={isLoading}
					className='bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg px-5 font-bold transition-colors disabled:opacity-50'
				>
					Send
				</button>
			</div>
		</div>
	);
}

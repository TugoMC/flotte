// src/pages/Error/Error403.jsx
import ErrorPage from './ErrorPage';

const Error403 = ({ message, details }) => {
    return <ErrorPage code={403} message={message} details={details} />;
};

export default Error403;
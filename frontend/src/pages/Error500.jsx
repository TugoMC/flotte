// src/pages/Error500.jsx
import ErrorPage from './ErrorPage';

const Error500 = ({ message, details }) => {
    return <ErrorPage code={500} message={message} details={details} />;
};

export default Error500;
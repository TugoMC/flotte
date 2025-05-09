// src/pages/Error401.jsx
import ErrorPage from './ErrorPage';

const Error401 = ({ message, details }) => {
    return <ErrorPage code={401} message={message} details={details} />;
};

export default Error401;
// src/pages/Error/Error400.jsx
import ErrorPage from './ErrorPage';

const Error400 = ({ message, details }) => {
    return <ErrorPage code={400} message={message} details={details} />;
};

export default Error400;
// src/pages/Error404.jsx
import ErrorPage from './ErrorPage';

const Error404 = ({ message, details }) => {
    return <ErrorPage code={404} message={message} details={details} />;
};

export default Error404;
import { createServices } from '@productivity/shared';
import apiClient from './client';

const services = createServices(apiClient);

export default services;

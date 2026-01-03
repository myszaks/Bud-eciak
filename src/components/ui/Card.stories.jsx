import React from 'react';
import Card from './Card';

export default {
  title: 'UI/Card',
  component: Card,
};

const Template = (args) => <Card {...args}>This is a card content.</Card>;

export const Default = Template.bind({});
Default.args = { noShadow: true, className: '' };

export const WithShadow = Template.bind({});
WithShadow.args = { noShadow: false };

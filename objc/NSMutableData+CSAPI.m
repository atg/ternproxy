//
//  NSMutableData+CSAPI.m
//  Activator
//
//  Created by Nicholas Penree on 9/1/08.
//  Copyright 2008 Conceited Software. All rights reserved.
//

#import "NSMutableData+CSAPI.h"

NSString *CSStringBoundary = @"0xKhTmLbOuNdArY";

@implementation NSMutableDataCSAPIDummy



@end



@implementation NSMutableData (CSAPI)

- (void)appendValue:(id)value forField:(NSString *)field
{
  if ([value isKindOfClass:[NSString class]])
	{
		[self appendStringValue:(NSString *)value forField:field];
	}
	else if ([value isKindOfClass:[NSNumber class]])
	{
		[self appendStringValue:[NSString stringWithFormat:@"%d", [value intValue]] forField:field];
	}	
#if TARGET_OS_IPHONE
	else if ([value isKindOfClass:[UIImage class]])
	{
		[self appendImageValue:(UIImage *)value forField:field];
	}
#endif
	else if ([value isKindOfClass:[NSArray class]])
	{
		NSString *arrayField = [field stringByAppendingString:@"[]"];
		for (id item in value)
		{
			[self appendValue:item forField:arrayField];
		}
	}
	else if ([value isKindOfClass:[NSData class]])
	{
		[self appendDataValue:(NSData *)value forField:field];
	}
	else if ([value conformsToProtocol:@protocol(CSAPIAttachment)])
	{
		[self appendAttachmentValue:(NSObject <CSAPIAttachment>*)value forField:field];
	}
	else
	{
		NSLog (@"*** WARNING: API did not recognize value %@", value);
	}
}

- (void)appendStringValue:(NSString *)value forField:(NSString *)field
{
	[self appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"%@\"\r\n\r\n", field] dataUsingEncoding:NSUTF8StringEncoding]];
	[self appendData:[value dataUsingEncoding:NSUTF8StringEncoding]];
	[self appendData:[[NSString stringWithFormat:@"\r\n--%@\r\n", CSStringBoundary] dataUsingEncoding:NSUTF8StringEncoding]];	
	
}

- (void)appendDataValue:(NSData *)value forField:(NSString *)field
{
	[self appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"%@\"\r\n\r\n", field] dataUsingEncoding:NSUTF8StringEncoding]];
	[self appendData:[@"Content-Transfer-Encoding: binary\r\n\r\n" dataUsingEncoding:NSASCIIStringEncoding]];
	[self appendData:value];
	[self appendData:[[NSString stringWithFormat:@"\r\n--%@\r\n", CSStringBoundary] dataUsingEncoding:NSUTF8StringEncoding]];	
}

- (void)appendAttachmentValue:(NSObject <CSAPIAttachment>*)value forField:(NSString *)field
{
	[self appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"%@\"; filename=\"%@\"\r\n", field, [value filename]] dataUsingEncoding:NSASCIIStringEncoding]];
	[self appendData:[[NSString stringWithFormat:@"Content-Type: %@\r\n", [value contentType]] dataUsingEncoding:NSASCIIStringEncoding]];
	[self appendData:[@"Content-Transfer-Encoding: binary\r\n\r\n" dataUsingEncoding:NSASCIIStringEncoding]];
	[self appendData:[value data]];
	[self appendData:[[NSString stringWithFormat:@"\r\n--%@\r\n", CSStringBoundary] dataUsingEncoding:NSUTF8StringEncoding]];
}

#if !TARGET_OS_IPHONE
- (void)appendImageValue:(NSImage *)value forField:(NSString *)field
{
	[self appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"%@\"; filename=\"%@.tiff\"\r\n", field, field] dataUsingEncoding:NSASCIIStringEncoding]];
	[self appendData:[@"Content-Type: image/tiff\r\n" dataUsingEncoding:NSASCIIStringEncoding]];
	[self appendData:[@"Content-Transfer-Encoding: binary\r\n\r\n" dataUsingEncoding:NSASCIIStringEncoding]];
	[self appendData:[value TIFFRepresentation]];
	[self appendData:[[NSString stringWithFormat:@"\r\n--%@\r\n", CSStringBoundary] dataUsingEncoding:NSUTF8StringEncoding]];
}
#else
- (void)appendImageValue:(UIImage *)value forField:(NSString *)field
{
	[self appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"%@\"; filename=\"%@.jpeg\"\r\n", field, field] dataUsingEncoding:NSASCIIStringEncoding]];
	[self appendData:[@"Content-Type: image/jpeg\r\n" dataUsingEncoding:NSASCIIStringEncoding]];
	[self appendData:[@"Content-Transfer-Encoding: binary\r\n\r\n" dataUsingEncoding:NSASCIIStringEncoding]];
	[self appendData:UIImageJPEGRepresentation(value, .8)];
	[self appendData:[[NSString stringWithFormat:@"\r\n--%@\r\n", CSStringBoundary] dataUsingEncoding:NSUTF8StringEncoding]];
}
#endif

@end